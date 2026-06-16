let verifyOtpHandler;
let googleCallbackHandler;
let emailSigninHandler;
let triggerTestLoginHandler;
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';
import { sendWhatsAppLoginAlert } from '@/lib/notifications/authWhatsapp';
import { applySupabaseCookies } from '@/lib/supabaseCookieHelper';

// Initialize env vars for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';

// Declare helper starting with 'mock' and using function statement so JS hoists it
function mockCreateClient() {
  const client = {
    from: jest.fn().mockImplementation(() => client),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        expires_at: new Date(Date.now() + 10000).toISOString(),
        max_attempts: 5,
        attempts: 0,
        otp_hash: 'mock-hash',
        id: 'otp-id',
        role: 'customer',
        is_suspended: false,
        phone: '+919999988888',
        audience: 'customer'
      },
      error: null
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: {
        id: 'user-id-123',
        role: 'customer',
        is_suspended: false,
        phone: '+919999988888',
        audience: 'customer',
        failed_login_attempts: 0,
        locked_until: null
      },
      error: null
    }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    // then support for destructured awaiting
    then: jest.fn().mockImplementation(function(onfulfilled) {
      return Promise.resolve({
        data: [{ id: 'user-id-123', phone: '+919999988888', audience: 'customer' }],
        error: null
      }).then(onfulfilled);
    }),
    rpc: jest.fn().mockImplementation((name) => {
      if (name === 'check_rate_limit') return Promise.resolve({ data: { allowed: true }, error: null });
      return Promise.resolve({ data: 'user-id-123', error: null });
    }),
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-id-123', email: 'test@example.com', phone_confirmed_at: '2026-06-12' } },
          error: null
        }),
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-id-123' } },
          error: null
        }),
        generateLink: jest.fn().mockResolvedValue({
          data: { properties: { hashed_token: 'hash' } },
          error: null
        }),
        updateUserById: jest.fn().mockResolvedValue({ data: {}, error: null }),
        listUsers: jest.fn().mockResolvedValue({
          data: { users: [{ id: 'user-id-123', email: 'test@example.com' }] },
          error: null
        }),
        deleteUser: jest.fn().mockResolvedValue({ error: null })
      },
      verifyOtp: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'act', refresh_token: 'rft' },
          user: { id: 'user-id-123', created_at: new Date().toISOString() }
        },
        error: null
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'act', refresh_token: 'rft' },
          user: { id: 'user-id-123' }
        },
        error: null
      }),
      signInWithIdToken: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'act', refresh_token: 'rft' },
          user: { id: 'user-id-123', created_at: new Date().toISOString(), identities: [{ provider: 'google' }] }
        },
        error: null
      }),
      setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
      refreshSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    }
  };
  return client;
}

const mockSharedClient = mockCreateClient();

// Mock Supabase modules with the helper
jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(() => mockSharedClient),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSharedClient),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSharedClient),
}));

jest.mock('@/lib/whatsapp/ensureBinding', () => ({
  ensureWhatsAppBinding: jest.fn(),
}));

jest.mock('@/lib/notifications/authWhatsapp', () => ({
  sendWhatsAppLoginAlert: jest.fn(),
}));

jest.mock('@/lib/supabaseCookieHelper', () => ({
  applySupabaseCookies: jest.fn(),
}));

jest.mock('@/lib/otpUtils', () => ({
  hashOTP: jest.fn((otp) => 'mock-hash'),
  validatePhoneNumber: jest.fn(() => true),
  getStablePhoneEmail: jest.fn((phone) => `phone-${phone}@intrust.in`),
  isPseudoEmail: jest.fn(() => true),
  normalizePhone: jest.fn((phone) => ({ cleanPhone: '9999999999', formattedPhone: '+919999999999', isValid: true })),
}));

jest.mock('@/lib/apiAuth', () => ({
  getAuthUser: jest.fn().mockResolvedValue({
    user: { id: 'admin-user-id' },
    profile: { role: 'admin' }
  }),
}));

describe('WhatsApp Login Alerts Router Integration Tests', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    verifyOtpHandler = require('../app/api/auth/verify-otp/route').POST;
    googleCallbackHandler = require('../app/api/auth/google/callback/route').GET;
    emailSigninHandler = require('../app/api/auth/email/signin/route').POST;
    triggerTestLoginHandler = require('../app/api/admin/trigger-test-login/route').POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ensureWhatsAppBinding.mockReset();
    sendWhatsAppLoginAlert.mockReset();

    // Default successful bindings and alerts
    ensureWhatsAppBinding.mockResolvedValue({
      linked: true,
      phone: '+919999988888',
      audience: 'customer',
      isNewLink: false
    });
    sendWhatsAppLoginAlert.mockResolvedValue(undefined);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id_token: 'fake-id-token', access_token: 'fake-access-token' }),
      text: async () => JSON.stringify({ id_token: 'fake-id-token', access_token: 'fake-access-token' })
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 30));

  describe('VERIFY-OTP Route handler', () => {
    const makeOtpRequest = (body) => ({
      json: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn().mockImplementation((name) => {
          if (name.toLowerCase() === 'user-agent') return 'test-user-agent-otp';
          return null;
        })
      },
      cookies: {
        getAll: () => []
      }
    });

    it('should NOT trigger sendWhatsAppLoginAlert when first-time signup (isNewLink: true)', async () => {
      ensureWhatsAppBinding.mockResolvedValue({
        linked: true,
        phone: '+919999988888',
        audience: 'customer',
        isNewLink: true
      });

      const req = makeOtpRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);

      expect(res.status).toBe(200);
      await flushPromises();

      expect(ensureWhatsAppBinding).toHaveBeenCalledWith({ userId: 'user-id-123' });
      expect(sendWhatsAppLoginAlert).not.toHaveBeenCalled();
    });

    it('should trigger sendWhatsAppLoginAlert when returning user (isNewLink: false)', async () => {
      ensureWhatsAppBinding.mockResolvedValue({
        linked: true,
        phone: '+919999988888',
        audience: 'customer',
        isNewLink: false
      });

      const req = makeOtpRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);

      expect(res.status).toBe(200);
      await flushPromises();

      expect(ensureWhatsAppBinding).toHaveBeenCalledWith({ userId: 'user-id-123' });
      expect(sendWhatsAppLoginAlert).toHaveBeenCalledWith({
        userId: 'user-id-123',
        audience: 'customer',
        phone: '+919999988888',
        deviceInfo: 'test-user-agent-otp'
      });
    });

    it('should not block or crash auth flow if WhatsApp send fails', async () => {
      ensureWhatsAppBinding.mockRejectedValue(new Error('Supabase network error'));

      const req = makeOtpRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);

      expect(res.status).toBe(200);
      await expect(flushPromises()).resolves.not.toThrow();
      expect(sendWhatsAppLoginAlert).not.toHaveBeenCalled();
    });
  });

  describe('GOOGLE OAuth Callback Route handler', () => {
    const makeGoogleRequest = () => ({
      url: 'http://localhost/api/auth/google/callback?code=mockcode&state=%7B%22next%22%3A%22%2Fdashboard%22%7D',
      headers: {
        get: jest.fn().mockImplementation((name) => {
          if (name.toLowerCase() === 'host') return 'localhost:3000';
          if (name.toLowerCase() === 'user-agent') return 'test-user-agent-google';
          return null;
        })
      }
    });

    it('should NOT trigger sendWhatsAppLoginAlert when brand new Google signup (isNewLink: true)', async () => {
      ensureWhatsAppBinding.mockResolvedValue({
        linked: true,
        phone: '+919999988888',
        audience: 'customer',
        isNewLink: true
      });

      const req = makeGoogleRequest();
      const res = await googleCallbackHandler(req);

      expect(res.status).toBe(307); // redirect code
      await flushPromises();

      expect(ensureWhatsAppBinding).toHaveBeenCalledWith({ userId: 'user-id-123' });
      expect(sendWhatsAppLoginAlert).not.toHaveBeenCalled();
    });

    it('should trigger sendWhatsAppLoginAlert when returning Google user (isNewLink: false)', async () => {
      ensureWhatsAppBinding.mockResolvedValue({
        linked: true,
        phone: '+919999988888',
        audience: 'customer',
        isNewLink: false
      });

      const req = makeGoogleRequest();
      const res = await googleCallbackHandler(req);

      expect(res.status).toBe(307);
      await flushPromises();

      expect(ensureWhatsAppBinding).toHaveBeenCalledWith({ userId: 'user-id-123' });
      expect(sendWhatsAppLoginAlert).toHaveBeenCalledWith({
        userId: 'user-id-123',
        audience: 'customer',
        phone: '+919999988888',
        deviceInfo: 'test-user-agent-google'
      });
    });

    it('should not block or crash redirect if WhatsApp binding checks throw errors', async () => {
      ensureWhatsAppBinding.mockRejectedValue(new Error('WhatsApp service down'));

      const req = makeGoogleRequest();
      const res = await googleCallbackHandler(req);

      expect(res.status).toBe(307);
      await expect(flushPromises()).resolves.not.toThrow();
      expect(sendWhatsAppLoginAlert).not.toHaveBeenCalled();
    });
  });

  describe('EMAIL Sign-in Route handler', () => {
    const makeEmailRequest = (body) => ({
      json: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn().mockImplementation((name) => {
          if (name.toLowerCase() === 'user-agent') return 'test-user-agent-email';
          return null;
        })
      },
      cookies: {
        getAll: () => []
      }
    });

    it('should call ensureWhatsAppBinding and sendWhatsAppLoginAlert in order', async () => {
      ensureWhatsAppBinding.mockResolvedValue({
        linked: true,
        phone: '+919999988888',
        audience: 'customer',
        isNewLink: false
      });

      const req = makeEmailRequest({ email: 'test@example.com', password: 'password123' });
      const res = await emailSigninHandler(req);

      expect(res.status).toBe(200);
      expect(ensureWhatsAppBinding).toHaveBeenCalledWith({ userId: 'user-id-123' });
      expect(sendWhatsAppLoginAlert).toHaveBeenCalledWith({
        userId: 'user-id-123',
        audience: 'customer',
        phone: '+919999988888',
        deviceInfo: 'test-user-agent-email'
      });
    });

    it('should not block or fail if WhatsApp alert fails or throws', async () => {
      ensureWhatsAppBinding.mockResolvedValue({
        linked: true,
        phone: '+919999988888',
        audience: 'customer'
      });
      sendWhatsAppLoginAlert.mockRejectedValue(new Error('WABA rate limit'));

      const req = makeEmailRequest({ email: 'test@example.com', password: 'password123' });
      const res = await emailSigninHandler(req);

      expect(res.status).toBe(200);
      expect(sendWhatsAppLoginAlert).toHaveBeenCalled();
    });

    it('should return 401 invalid-credentials for wrong password when email identity exists', async () => {
      const mockAdminClient = require('@/lib/supabaseServer').createAdminClient();
      // Simulate existing user with email identity
      mockAdminClient.auth.admin.getUserById.mockResolvedValueOnce({
        data: { user: { id: 'user-id-123', email: 'test@example.com', app_metadata: { provider: 'google', providers: ['google', 'email'] }, identities: [{ provider: 'email' }] } },
        error: null
      });
      // Simulate wrong password
      const mockServerClient = require('@supabase/ssr').createServerClient();
      mockServerClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' }
      });

      const req = makeEmailRequest({ email: 'test@example.com', password: 'wrong' });
      const res = await emailSigninHandler(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Invalid email or password.');
    });

    it('should return 409 conflict when user lacks email identity (genuine Google user)', async () => {
      const mockAdminClient = require('@/lib/supabaseServer').createAdminClient();
      // Simulate existing user WITHOUT email identity
      mockAdminClient.auth.admin.getUserById.mockResolvedValueOnce({
        data: { user: { id: 'user-id-123', email: 'test@example.com', app_metadata: { provider: 'google', providers: ['google'] }, identities: [{ provider: 'google' }] } },
        error: null
      });
      const mockServerClient = require('@supabase/ssr').createServerClient();
      mockServerClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' }
      });

      const req = makeEmailRequest({ email: 'test@example.com', password: 'password123' });
      const res = await emailSigninHandler(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.conflict).toBe(true);
      expect(json.provider).toBe('google');
    });
  });

  describe('TRIGGER-TEST-LOGIN Route handler', () => {
    const makeTriggerRequest = (body) => ({
      json: jest.fn().mockResolvedValue(body),
      headers: {
        get: jest.fn().mockImplementation((name) => {
          if (name.toLowerCase() === 'user-agent') return 'test-user-agent-trigger';
          return null;
        })
      }
    });

    it('should call sendWhatsAppLoginAlert using route parameters and return success', async () => {
      const req = makeTriggerRequest({ targetUserId: 'target-user-456' });
      const res = await triggerTestLoginHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe('sent');

      expect(sendWhatsAppLoginAlert).toHaveBeenCalledWith({
        userId: 'target-user-456',
        audience: 'customer',
        phone: '+919999988888',
        deviceInfo: 'test-user-agent-trigger'
      });
    });
  });
});
