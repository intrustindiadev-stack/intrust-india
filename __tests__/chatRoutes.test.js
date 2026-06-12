import { POST as customerPOST } from '../app/api/chat/message/route';
import { POST as merchantPOST } from '../app/api/merchant/chat/message/route';

const mockCreateChat = jest.fn().mockImplementation(({ model, config, history }) => {
  return {
    sendMessage: jest.fn().mockImplementation(async ({ message, config: sendConfig }) => {
      // If config contains an abortSignal, listen to it
      if (sendConfig?.abortSignal) {
        return new Promise((resolve, reject) => {
          const onAbort = () => {
            reject(new Error('DOMException: The user aborted a request.'));
          };
          if (sendConfig.abortSignal.aborted) {
            onAbort();
          } else {
            sendConfig.abortSignal.addEventListener('abort', onAbort);
          }
        });
      }
      return { text: 'Hello!' };
    })
  };
});

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        chats: {
          create: mockCreateChat
        }
      };
    })
  };
});

jest.mock('@/lib/supabaseServer', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
    },
    from: jest.fn().mockImplementation((table) => {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { id: 'session-id' }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: table === 'user_profiles' ? { role: 'merchant' } : {},
          error: null
        }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'session-id' }, error: null }),
        update: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
    })
  };
  return {
    createServerSupabaseClient: jest.fn().mockResolvedValue(mockSupabase),
    createAdminClient: jest.fn().mockReturnValue(mockSupabase)
  };
});

jest.mock('@/lib/chat/buildContext', () => ({
  buildUserContext: jest.fn().mockResolvedValue({ firstName: 'Test' }),
  formatContextForPrompt: jest.fn().mockReturnValue('mock context')
}));

jest.mock('@/lib/chat/merchantBuildContext', () => ({
  buildMerchantContext: jest.fn().mockResolvedValue({ firstName: 'Test', isMerchant: true }),
  formatMerchantContextForPrompt: jest.fn().mockReturnValue('mock context')
}));

describe('Chat API Timeout Fallbacks', () => {
  let originalGeminiModel;

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'mock-key';
    process.env.GEMINI_TIMEOUT_MS = '1000';
    originalGeminiModel = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
  });

  afterAll(() => {
    delete process.env.GEMINI_TIMEOUT_MS;
    if (originalGeminiModel !== undefined) {
      process.env.GEMINI_MODEL = originalGeminiModel;
    } else {
      delete process.env.GEMINI_MODEL;
    }
  });

  beforeEach(() => {
    mockCreateChat.mockClear();
  });

  it('customer route should abort after configured timeout (with retry) and return fallback message', async () => {
    const req = new Request('http://localhost/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const startTime = Date.now();
    const res = await customerPOST(req);
    const duration = Date.now() - startTime;

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toContain('I had trouble reaching my brain just now');
    expect(duration).toBeGreaterThanOrEqual(2000);
    expect(duration).toBeLessThan(2600);

    expect(mockCreateChat).toHaveBeenCalled();
    const createArgs = mockCreateChat.mock.calls[0][0];
    expect(createArgs.model).toBe('gemini-2.5-flash');
    expect(createArgs.config.thinkingConfig.thinkingBudget).toBe(-1);
  }, 10000);

  it('merchant route should abort after configured timeout (with retry) and return fallback message', async () => {
    const req = new Request('http://localhost/api/merchant/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const startTime = Date.now();
    const res = await merchantPOST(req);
    const duration = Date.now() - startTime;

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reply).toContain('I had trouble reaching my brain just now');
    expect(duration).toBeGreaterThanOrEqual(2000);
    expect(duration).toBeLessThan(2600);

    expect(mockCreateChat).toHaveBeenCalled();
    const createArgs = mockCreateChat.mock.calls[0][0];
    expect(createArgs.model).toBe('gemini-2.5-flash');
    expect(createArgs.config.thinkingConfig.thinkingBudget).toBe(-1);
  }, 10000);

  it('should be resilient and function normally when context builder returns partial context', async () => {
    const { buildUserContext } = require('@/lib/chat/buildContext');
    const { buildMerchantContext } = require('@/lib/chat/merchantBuildContext');

    buildUserContext.mockResolvedValueOnce({ firstName: 'PartialResilientCustomer' });
    buildMerchantContext.mockResolvedValueOnce({ firstName: 'PartialResilientMerchant', isMerchant: true });

    // 1. Customer Route
    mockCreateChat.mockImplementationOnce(() => {
      return {
        sendMessage: jest.fn().mockResolvedValue({
          text: 'Hello Customer!',
          candidates: [{ finishReason: 'STOP' }]
        })
      };
    });

    const customerReq = new Request('http://localhost/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const customerRes = await customerPOST(customerReq);
    expect(customerRes.status).toBe(200);
    const customerData = await customerRes.json();
    expect(customerData.firstName).toBe('PartialResilientCustomer');
    expect(customerData.reply).toBe('Hello Customer!');

    // 2. Merchant Route
    mockCreateChat.mockImplementationOnce(() => {
      return {
        sendMessage: jest.fn().mockResolvedValue({
          text: 'Hello Merchant!',
          candidates: [{ finishReason: 'STOP' }]
        })
      };
    });

    const merchantReq = new Request('http://localhost/api/merchant/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const merchantRes = await merchantPOST(merchantReq);
    expect(merchantRes.status).toBe(200);
    const merchantData = await merchantRes.json();
    expect(merchantData.firstName).toBe('PartialResilientMerchant');
    expect(merchantData.reply).toBe('Hello Merchant!');
  });
});
