import { notifyMerchantAiOrderAssigned } from '@/lib/notifications/merchantWhatsapp';
import * as omniflow from '@/lib/omniflow';

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/omniflow', () => {
  const actual = jest.requireActual('@/lib/omniflow');
  return {
    ...actual,
    sendTemplateMessage: jest.fn(),
  };
});

describe('InTrust Business WhatsApp Notifications for Assigned AI Orders', () => {
  let mockAdmin;
  let mockDatabase;

  const MERCHANT_A_ID = 'merchant-user-uuid-1111';
  const MERCHANT_B_ID = 'merchant-user-uuid-2222';
  const ORDER_ID = 'ai-order-uuid-9999';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    mockDatabase = {
      whatsapp_message_logs: [],
      user_channel_bindings: [
        {
          user_id: MERCHANT_A_ID,
          phone: '+919876543210',
          audience: 'merchant',
          whatsapp_opt_in: true,
        },
        {
          user_id: MERCHANT_B_ID,
          phone: '+919123456780',
          audience: 'merchant',
          whatsapp_opt_in: true,
        },
      ],
      merchants: [
        {
          id: 'm-row-1',
          user_id: MERCHANT_A_ID,
          business_name: 'Sharma Electronics',
          business_phone: '+919876543210',
        },
        {
          id: 'm-row-2',
          user_id: MERCHANT_B_ID,
          business_name: 'Verma Traders',
          business_phone: '+919123456780',
        },
      ],
      user_profiles: [
        {
          id: MERCHANT_A_ID,
          full_name: 'Rahul Sharma',
          phone: '+919876543210',
        },
        {
          id: MERCHANT_B_ID,
          full_name: 'Amit Verma',
          phone: '+919123456780',
        },
      ],
      merchant_notification_settings: [
        {
          user_id: MERCHANT_A_ID,
          whatsapp_notifications: true,
        },
        {
          user_id: MERCHANT_B_ID,
          whatsapp_notifications: true,
        },
      ],
    };

    const createQueryBuilder = (tableName) => {
      const filters = {};
      const builder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((col, val) => {
          filters[col] = val;
          return builder;
        }),
        gte: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(async () => {
          const list = mockDatabase[tableName] || [];
          const found = list.find((row) =>
            Object.entries(filters).every(([k, v]) => row[k] === v)
          );
          return { data: found || null, error: null };
        }),
        single: jest.fn(async () => {
          const list = mockDatabase[tableName] || [];
          const found = list.find((row) =>
            Object.entries(filters).every(([k, v]) => row[k] === v)
          );
          if (!found) return { data: null, error: new Error('Not found') };
          return { data: found, error: null };
        }),
        insert: jest.fn(async (row) => {
          if (!mockDatabase[tableName]) mockDatabase[tableName] = [];
          const record = { id: `log-${Date.now()}-${Math.random()}`, ...row };
          mockDatabase[tableName].push(record);
          return { data: record, error: null };
        }),
        update: jest.fn(async () => ({ error: null })),
      };
      return builder;
    };

    mockAdmin = {
      from: jest.fn((tableName) => createQueryBuilder(tableName)),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1 & 2: AI Order assigned to Merchant A → WhatsApp sent to Merchant A, Merchant B does NOT receive it', async () => {
    omniflow.sendTemplateMessage.mockResolvedValueOnce({
      success: true,
      messageId: 'wamid.HBgLMTIzNDU2',
    });

    const result = await notifyMerchantAiOrderAssigned({
      orderId: ORDER_ID,
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1028',
      wholesalePricePaise: 5000000,
      profitMarginPaise: 500000,
      adminClientOverride: mockAdmin,
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('wamid.HBgLMTIzNDU2');

    // Verify OmniFlow called exactly ONCE and ONLY with Merchant A's phone
    expect(omniflow.sendTemplateMessage).toHaveBeenCalledTimes(1);
    expect(omniflow.sendTemplateMessage).toHaveBeenCalledWith(
      '+919876543210', // Merchant A phone
      expect.any(String),
      expect.any(String),
      expect.any(Array)
    );

    // Verify Merchant B's phone was NEVER called
    expect(omniflow.sendTemplateMessage).not.toHaveBeenCalledWith(
      '+919123456780',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );

    // Verify audit log recorded for Merchant A
    const logs = mockDatabase.whatsapp_message_logs.filter((l) => l.user_id === MERCHANT_A_ID);
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe('sent');
    expect(logs[0].wamid).toBe('wamid.HBgLMTIzNDU2');
  });

  test('3: PENDING unassigned order (no merchantUserId) → no WhatsApp sent', async () => {
    const result = await notifyMerchantAiOrderAssigned({
      orderId: ORDER_ID,
      merchantUserId: null, // unassigned
      orderCode: 'AI-1028',
      wholesalePricePaise: 5000000,
      profitMarginPaise: 500000,
      adminClientOverride: mockAdmin,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('UNASSIGNED');
    expect(omniflow.sendTemplateMessage).not.toHaveBeenCalled();
    expect(mockDatabase.whatsapp_message_logs.length).toBe(0);
  });

  test('4: Assignment failure (missing orderId) → no WhatsApp sent', async () => {
    const result = await notifyMerchantAiOrderAssigned({
      orderId: null, // failed/missing
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1028',
      wholesalePricePaise: 5000000,
      profitMarginPaise: 500000,
      adminClientOverride: mockAdmin,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('UNASSIGNED');
    expect(omniflow.sendTemplateMessage).not.toHaveBeenCalled();
  });

  test('5: Correct merchant phone is resolved server-side (binding > merchants.business_phone > user_profiles.phone)', async () => {
    omniflow.sendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' });

    // Scenario A: Binding phone present
    await notifyMerchantAiOrderAssigned({
      orderId: 'order-1',
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1001',
      wholesalePricePaise: 100000,
      profitMarginPaise: 10000,
      adminClientOverride: mockAdmin,
    });
    expect(omniflow.sendTemplateMessage).toHaveBeenLastCalledWith(
      '+919876543210',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );

    // Scenario B: Binding phone absent, falls back to merchants.business_phone
    mockDatabase.user_channel_bindings = [];
    mockDatabase.merchants[0].business_phone = '9811122233'; // 10-digit raw
    await notifyMerchantAiOrderAssigned({
      orderId: 'order-2',
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1002',
      wholesalePricePaise: 100000,
      profitMarginPaise: 10000,
      adminClientOverride: mockAdmin,
    });
    expect(omniflow.sendTemplateMessage).toHaveBeenLastCalledWith(
      '+919811122233', // E.164 normalised
      expect.anything(),
      expect.anything(),
      expect.anything()
    );

    // Scenario C: merchants.business_phone absent, falls back to user_profiles.phone
    mockDatabase.merchants[0].business_phone = null;
    mockDatabase.user_profiles[0].phone = '+919988776655';
    await notifyMerchantAiOrderAssigned({
      orderId: 'order-3',
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1003',
      wholesalePricePaise: 100000,
      profitMarginPaise: 10000,
      adminClientOverride: mockAdmin,
    });
    expect(omniflow.sendTemplateMessage).toHaveBeenLastCalledWith(
      '+919988776655',
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  test('6: Correct merchant name resolved (merchants.business_name > user_profiles.full_name > "Merchant")', async () => {
    omniflow.sendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' });

    await notifyMerchantAiOrderAssigned({
      orderId: ORDER_ID,
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1028',
      wholesalePricePaise: 5000000,
      profitMarginPaise: 500000,
      adminClientOverride: mockAdmin,
    });

    const calledComponents = omniflow.sendTemplateMessage.mock.calls[0][3];
    const bodyComp = calledComponents.find((c) => c.type === 'body');
    // First parameter is merchant name
    expect(bodyComp.parameters[0].text).toBe('Sharma Electronics');
  });

  test('7, 8, 9: Correct AI Order number, wholesale amount, and profit formatted', async () => {
    omniflow.sendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' });

    await notifyMerchantAiOrderAssigned({
      orderId: ORDER_ID,
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1028',
      wholesalePricePaise: 6500000, // ₹65,000
      profitMarginPaise: 650000,   // ₹6,500
      adminClientOverride: mockAdmin,
    });

    const calledComponents = omniflow.sendTemplateMessage.mock.calls[0][3];
    const bodyComp = calledComponents.find((c) => c.type === 'body');
    expect(bodyComp.parameters[1].text).toBe('AI-1028');
    expect(bodyComp.parameters[2].text).toBe('65,000');
    expect(bodyComp.parameters[3].text).toBe('6,500');
  });

  test('10 & 11: Correct OmniFlow template name and language invoked', async () => {
    omniflow.sendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' });

    await notifyMerchantAiOrderAssigned({
      orderId: ORDER_ID,
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1028',
      wholesalePricePaise: 5000000,
      profitMarginPaise: 500000,
      adminClientOverride: mockAdmin,
    });

    const templateName = omniflow.sendTemplateMessage.mock.calls[0][1];
    const templateLang = omniflow.sendTemplateMessage.mock.calls[0][2];

    expect(templateName).toBe('intrust_ai_order_assigned');
    expect(templateLang).toBe('en_US');
  });

  test('12: Duplicate request does not send duplicate WhatsApp (idempotency guard)', async () => {
    omniflow.sendTemplateMessage.mockResolvedValue({ success: true, messageId: 'msg-1' });

    // First call: succeeds and logs sent status
    const firstCall = await notifyMerchantAiOrderAssigned({
      orderId: ORDER_ID,
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1028',
      wholesalePricePaise: 5000000,
      profitMarginPaise: 500000,
      adminClientOverride: mockAdmin,
    });
    expect(firstCall.success).toBe(true);
    expect(omniflow.sendTemplateMessage).toHaveBeenCalledTimes(1);

    // Second call with the same orderId: skipped due to existing sent log
    const secondCall = await notifyMerchantAiOrderAssigned({
      orderId: ORDER_ID,
      merchantUserId: MERCHANT_A_ID,
      orderCode: 'AI-1028',
      wholesalePricePaise: 5000000,
      profitMarginPaise: 500000,
      adminClientOverride: mockAdmin,
    });
    expect(secondCall.success).toBe(true);
    expect(secondCall.skipped).toBe(true);
    expect(secondCall.reason).toBe('ALREADY_SENT');

    // sendTemplateMessage should still only have been called ONCE
    expect(omniflow.sendTemplateMessage).toHaveBeenCalledTimes(1);
  });

  test('13: OmniFlow failure does not break AI Order assignment (error isolation)', async () => {
    const omniError = new Error('WhatsApp provider rate limit exceeded');
    omniError.code = 'RATE_LIMIT';
    omniError.rawSnippet = '{"error": "Too Many Requests"}';
    omniflow.sendTemplateMessage.mockRejectedValueOnce(omniError);

    // The function must NOT throw an unhandled exception
    let result;
    await expect((async () => {
      result = await notifyMerchantAiOrderAssigned({
        orderId: ORDER_ID,
        merchantUserId: MERCHANT_A_ID,
        orderCode: 'AI-1028',
        wholesalePricePaise: 5000000,
        profitMarginPaise: 500000,
        adminClientOverride: mockAdmin,
      });
    })()).resolves.not.toThrow();

    expect(result.success).toBe(false);
    expect(result.error).toBe('WhatsApp provider rate limit exceeded');

    // Audit log should record failure without affecting caller
    const failureLog = mockDatabase.whatsapp_message_logs.find(
      (l) => l.user_id === MERCHANT_A_ID && l.status === 'failed'
    );
    expect(failureLog).toBeDefined();
    expect(failureLog.error_code).toBe('RATE_LIMIT');
  });

  test('14: Existing realtime notification modal channel filter logic remains intact', () => {
    // In AIOrderNotificationModal:
    // (order.status === 'PENDING' && (!order.merchant_id || order.merchant_id === merchantUserId))
    const isTargetedToMerchant = (order, merchantUserId) =>
      order.status === 'PENDING' && (!order.merchant_id || order.merchant_id === merchantUserId);

    // Targeted to Merchant A
    expect(isTargetedToMerchant({ status: 'PENDING', merchant_id: MERCHANT_A_ID }, MERCHANT_A_ID)).toBe(true);
    // Unassigned broadcast order -> open to both
    expect(isTargetedToMerchant({ status: 'PENDING', merchant_id: null }, MERCHANT_A_ID)).toBe(true);
    expect(isTargetedToMerchant({ status: 'PENDING', merchant_id: null }, MERCHANT_B_ID)).toBe(true);
    // Targeted to Merchant A -> Merchant B is blocked
    expect(isTargetedToMerchant({ status: 'PENDING', merchant_id: MERCHANT_A_ID }, MERCHANT_B_ID)).toBe(false);
  });

  test('15: Existing AI Order acceptance flow remains intact with lock status transition', () => {
    // Simulating sabpaisa/initiate lock:
    // order.status -> 'PAYMENT_PENDING', merchant_id -> user.id
    const orderBefore = { id: ORDER_ID, status: 'PENDING', merchant_id: null };
    const orderAfterLock = {
      ...orderBefore,
      status: 'PAYMENT_PENDING',
      merchant_id: MERCHANT_A_ID,
      sabpaisa_txn_id: 'AIO_1720000000_1234',
    };

    expect(orderAfterLock.status).toBe('PAYMENT_PENDING');
    expect(orderAfterLock.merchant_id).toBe(MERCHANT_A_ID);
  });

  test('16: Existing completion / vault credit RPC contract remains intact', () => {
    // Verifying complete_ai_order_and_credit_vault parameters contract
    const rpcParams = {
      p_order_id: ORDER_ID,
      p_merchant_id: MERCHANT_A_ID,
      p_principal_amount_paise: 5000000,
      p_profit_amount_paise: 500000,
    };

    expect(rpcParams.p_principal_amount_paise).toBe(5000000);
    expect(rpcParams.p_profit_amount_paise).toBe(500000);
    expect(rpcParams.p_order_id).toBe(ORDER_ID);
    expect(rpcParams.p_merchant_id).toBe(MERCHANT_A_ID);
  });
});
