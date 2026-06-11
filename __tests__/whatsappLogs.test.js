import { notifyMerchantNewOrder } from '../lib/notifications/merchantWhatsapp';
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
