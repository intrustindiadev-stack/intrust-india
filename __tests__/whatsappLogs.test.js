import { notifyMerchantNewOrder } from '../lib/notifications/merchantWhatsapp';
import { broadcastMorningGreeting } from '../lib/notifications/userWhatsapp';
import { createAdminClient } from '@/lib/supabaseServer';
import { sendTemplateMessage, OmniflowError } from '@/lib/omniflow';

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/omniflow', () => {
  const original = jest.requireActual('@/lib/omniflow');
  return {
    ...original,
    sendTemplateMessage: jest.fn(),
  };
});

describe('WhatsApp Error Logging for Merchant Dispatcher', () => {
  let mockSupabase;
  let mockInsert;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInsert = jest.fn().mockResolvedValue({ error: null });

    const mockMaybeSingle = jest.fn().mockImplementation(async () => {
      // Find the last .from() call to identify the table
      const lastTable = mockFrom.mock.calls[mockFrom.mock.calls.length - 1]?.[0];
      if (lastTable === 'user_channel_bindings') {
        return { data: { phone: '+919999999999' }, error: null };
      }
      if (lastTable === 'merchant_notification_settings') {
        return { data: { whatsapp_order_alerts: true, whatsapp_notifications: true }, error: null };
      }
      return { data: null, error: null };
    });

    const chain = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.gte = jest.fn().mockReturnValue(chain);
    chain.maybeSingle = mockMaybeSingle;
    chain.single = mockMaybeSingle;

    const mockFrom = jest.fn().mockReturnValue(chain);
    
    // Wire insert to the same from mock so it can be called on the builder
    chain.insert = mockInsert;

    mockSupabase = {
      from: mockFrom,
    };

    createAdminClient.mockReturnValue(mockSupabase);
  });

  it('should log failed status with error_code and error_detail when sendTemplateMessage throws OmniflowError', async () => {
    const omniError = new OmniflowError('Cloud API limit reached', 131049, '{"error": "limit"}');
    sendTemplateMessage.mockRejectedValue(omniError);

    await notifyMerchantNewOrder({
      merchantUserId: 'user-123',
      orderShortId: 'ORD-123',
      amountRs: '100.00',
      itemCount: 2,
    });

    // Verify insert was called for failure
    expect(mockInsert).toHaveBeenCalled();
    const failureLogPayload = mockInsert.mock.calls[0][0];
    expect(failureLogPayload.status).toBe('failed');
    expect(failureLogPayload.error_code).toBe(131049);
    expect(failureLogPayload.error_detail).toBe('{"error": "limit"}');
    expect(failureLogPayload.content_preview).toContain('[FAILED]');
  });

  it('should log failed status with error_code and error_detail when sendTemplateMessage throws standard Error', async () => {
    const stdError = new Error('Network timeout');
    sendTemplateMessage.mockRejectedValue(stdError);

    await notifyMerchantNewOrder({
      merchantUserId: 'user-123',
      orderShortId: 'ORD-123',
      amountRs: '100.00',
      itemCount: 2,
    });

    expect(mockInsert).toHaveBeenCalled();
    const failureLogPayload = mockInsert.mock.calls[0][0];
    expect(failureLogPayload.status).toBe('failed');
    expect(failureLogPayload.error_code).toBeNull();
    expect(failureLogPayload.error_detail).toBe('Network timeout');
  });

  it('should log sent status with wamid when sendTemplateMessage resolves successfully', async () => {
    sendTemplateMessage.mockResolvedValue({
      success: true,
      messageId: 'mock-wamid-999',
      raw: { success: true, id: 'mock-wamid-999' }
    });

    await notifyMerchantNewOrder({
      merchantUserId: 'user-123',
      orderShortId: 'ORD-123',
      amountRs: '100.00',
      itemCount: 2,
    });

    expect(mockInsert).toHaveBeenCalled();
    const successLogPayload = mockInsert.mock.calls[0][0];
    expect(successLogPayload.status).toBe('sent');
    expect(successLogPayload.wamid).toBe('mock-wamid-999');
    expect(successLogPayload.error_code).toBeUndefined();
  });
});

import { broadcastMorningGreeting } from '../lib/notifications/userWhatsapp';
import {
  SYSTEM_BROADCAST_PHONE_HASH,
  FALLBACK_DAILY_QUOTES,
  getFallbackDailyQuote,
} from '../lib/notifications/whatsappConstants';

describe('Customer Marketing Consent Gate and Morning Broadcast', () => {
  let mockSupabase;
  let mockEq;
  let mockIn;
  let mockInsert;
  let mockUpdate;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEq = jest.fn().mockReturnThis();
    mockIn = jest.fn().mockReturnThis();
    mockInsert = jest.fn().mockResolvedValue({ error: null });
    mockUpdate = jest.fn().mockReturnThis();

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: mockEq,
      in: mockIn,
      insert: mockInsert,
      update: mockUpdate,
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockImplementation((cb) => cb({ data: [], error: null }))
    };

    mockSupabase = {
      from: jest.fn().mockReturnValue(chain)
    };

    createAdminClient.mockReturnValue(mockSupabase);
  });

  it('should query for both whatsapp_opt_in and whatsapp_marketing_opt_in with audience in customer/merchant', async () => {
    await broadcastMorningGreeting();

    expect(mockEq).toHaveBeenCalledWith('whatsapp_opt_in', true);
    expect(mockEq).toHaveBeenCalledWith('whatsapp_marketing_opt_in', true);
    expect(mockIn).toHaveBeenCalledWith('audience', ['customer', 'merchant']);
  });

  it('should use approved fallback quote and record SYSTEM_BROADCAST_PHONE_HASH when no quote is scheduled', async () => {
    const result = await broadcastMorningGreeting();

    expect(result.quote_id).toBe('fallback');
    // Verify system audit row inserted with sentinel phone_hash
    expect(mockInsert).toHaveBeenCalled();
    const auditCalls = mockInsert.mock.calls.filter(call =>
      call[0]?.phone_hash === SYSTEM_BROADCAST_PHONE_HASH
    );
    expect(auditCalls.length).toBeGreaterThan(0);
    expect(auditCalls[0][0].phone_hash).toBe(SYSTEM_BROADCAST_PHONE_HASH);
    expect(auditCalls[0][0].user_id).toBeNull();
  });

  it('should use scheduled quote and mark it as sent when scheduled quote is found', async () => {
    const scheduledQuote = {
      id: 'quote-uuid-123',
      quote_text: 'The best way to predict the future is to create it.',
    };

    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: mockEq,
      in: mockIn,
      insert: mockInsert,
      update: mockUpdate,
      maybeSingle: jest.fn().mockResolvedValue({ data: scheduledQuote, error: null }),
      then: jest.fn().mockImplementation((cb) => cb({ data: [], error: null }))
    };
    mockSupabase.from = jest.fn().mockReturnValue(chain);

    const result = await broadcastMorningGreeting();

    expect(result.quote_id).toBe('quote-uuid-123');
  });

  it('should provide deterministic fallback quotes for a given date', () => {
    const quote1 = getFallbackDailyQuote('2026-09-07');
    const quote2 = getFallbackDailyQuote('2026-09-07');
    expect(quote1).toBe(quote2);
    expect(FALLBACK_DAILY_QUOTES).toContain(quote1);
  });
});
