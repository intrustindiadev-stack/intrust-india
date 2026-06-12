import { POST } from '@/app/api/webhooks/omniflow/route';
import { createAdminClient } from '@/lib/supabaseServer';

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn()
}));

jest.mock('@/lib/omniflow', () => ({
  sendWhatsAppMessage: jest.fn(),
  sendMessageToAgent: jest.fn(),
  normalisePhone: jest.fn((p) => p)
}));

jest.mock('@/lib/chat/merchantBuildContext', () => ({
  buildMerchantContext: jest.fn(),
  formatMerchantContextForPrompt: jest.fn()
}));

jest.mock('@/lib/piiFilter', () => ({
  sanitizeMessage: jest.fn((m) => m)
}));

describe('Omniflow Webhook Status Reconciliation', () => {
  const mockMaybeSingle = jest.fn();
  const mockEq = jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
  const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
  const mockUpdateEq = jest.fn().mockResolvedValue({ data: null, error: null });
  const mockUpdate = jest.fn().mockReturnValue({ eq: mockUpdateEq });

  beforeEach(() => {
    jest.clearAllMocks();
    mockMaybeSingle.mockReset();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockUpdateEq.mockClear();
    mockUpdate.mockClear();

    delete process.env.OMNIFLOW_WEBHOOK_SECRET; // Bypass signature validation

    createAdminClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      })
    });
  });

  const createRequest = (payload) => {
    return {
      text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
      headers: { get: jest.fn() }
    };
  };

  it('should ignore unknown wamid without throwing', async () => {
    const payload = { type: 'message_status', wamid: 'wamid.unknown', status: 'delivered' };
    const req = createRequest(payload);

    mockMaybeSingle.mockResolvedValueOnce({ data: null }); // wamid not found

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should update status to delivered when rank is higher', async () => {
    const payload = { type: 'message_status', wamid: 'wamid.123', status: 'delivered' };
    const req = createRequest(payload);

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'log.1', status: 'sent' } });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'delivered',
      error_code: null,
      error_detail: null
    });
  });

  it('should not update status if existing rank is equal or higher (idempotency/out-of-order)', async () => {
    const payload = { type: 'message_status', wamid: 'wamid.123', status: 'delivered' };
    const req = createRequest(payload);

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'log.1', status: 'read' } });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should map provider failed status to failed', async () => {
    const payload = { type: 'message_status', wamid: 'wamid.123', status: 'failed', error_code: '400', error_detail: 'bad' };
    const req = createRequest(payload);

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'log.1', status: 'sent' } });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'failed',
      error_code: '400',
      error_detail: 'bad'
    });
  });

  it('should map specific error code to undeliverable', async () => {
    const payload = { type: 'status', wamid: 'wamid.123', status: 'failed', error_code: '131026' };
    const req = createRequest(payload);

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'log.1', status: 'sent' } });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'undeliverable',
      error_code: '131026',
      error_detail: null
    });
  });

  it('should map literal undeliverable status to undeliverable', async () => {
    const payload = { type: 'message_status', wamid: 'wamid.123', status: 'undeliverable', reason: 'blocked' };
    const req = createRequest(payload);

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'log.1', status: 'sent' } });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'undeliverable',
      error_code: null,
      error_detail: 'blocked'
    });
  });

  it('should handle payload with only status and wamid but no type', async () => {
    const payload = { wamid: 'wamid.123', status: 'read' };
    const req = createRequest(payload);

    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'log.1', status: 'delivered' } });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'read',
      error_code: null,
      error_detail: null
    });
  });

});

describe('Inbound Routing for Shared Numbers', () => {
  let bindingsMockVal = [];
  let lastOutboundMockVal = null;
  let profilesMockVal = [];
  let mockSendWhatsAppMessage;
  let mockSendMessageToAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    bindingsMockVal = [];
    lastOutboundMockVal = null;
    profilesMockVal = [];

    mockSendWhatsAppMessage = require('@/lib/omniflow').sendWhatsAppMessage;
    mockSendMessageToAgent = require('@/lib/omniflow').sendMessageToAgent;

    mockSendWhatsAppMessage.mockResolvedValue({ messageId: 'msg.outbound.123' });
    mockSendMessageToAgent.mockResolvedValue('Mock Agent Reply');

    const buildMerchantContext = require('@/lib/chat/merchantBuildContext').buildMerchantContext;
    buildMerchantContext.mockResolvedValue({
      recentOrders: [],
      pendingFulfillmentsCount: 0,
      pendingPayoutsCount: 0,
      pendingPayoutsTotalRs: '0.00',
      lastPayoutStatus: 'N/A',
      walletBalanceRs: '0.00',
      totalCommissionPaidRs: '0.00',
      liveInventoryCount: 0,
      lowStockCount: 0,
      subscriptionStatus: 'active',
      kycStatus: 'Verified',
      bankVerified: true
    });

    let currentTable = '';
    const dbMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      maybeSingle: jest.fn().mockImplementation(() => {
        if (currentTable === 'user_channel_bindings') {
          return Promise.resolve({ data: bindingsMockVal });
        }
        if (currentTable === 'whatsapp_message_logs') {
          return Promise.resolve({ data: lastOutboundMockVal });
        }
        if (currentTable === 'customer_wallets') {
          return Promise.resolve({ data: { balance_paise: 5000 } });
        }
        return Promise.resolve({ data: null });
      }),
      single: jest.fn().mockImplementation(() => {
        if (currentTable === 'user_profiles') {
          return Promise.resolve({ data: { kyc_status: 'Verified', full_name: 'Test Customer' } });
        }
        return Promise.resolve({ data: null });
      }),
      then: jest.fn().mockImplementation((onfulfilled) => {
        if (currentTable === 'user_profiles') {
          return Promise.resolve({ data: profilesMockVal }).then(onfulfilled);
        }
        if (currentTable === 'user_channel_bindings') {
          return Promise.resolve({ data: bindingsMockVal }).then(onfulfilled);
        }
        return Promise.resolve({ data: [] }).then(onfulfilled);
      })
    };

    createAdminClient.mockReturnValue({
      from: jest.fn().mockImplementation((table) => {
        currentTable = table;
        return dbMock;
      })
    });
  });

    const createRequest = (payload) => {
      return {
        text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
        headers: { get: jest.fn() }
      };
    };

    it('should route single merchant binding to merchant', async () => {
      bindingsMockVal = [{ user_id: 'merchant-1', audience: 'merchant' }];
      const payload = { phone: '+916232809817', message: 'Hello merchant', type: 'message_received' };
      const req = createRequest(payload);

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendMessageToAgent).toHaveBeenCalled();
    });

    it('should route shared number to merchant when last outbound log was merchant', async () => {
      bindingsMockVal = [
        { user_id: 'customer-1', audience: 'customer' },
        { user_id: 'merchant-1', audience: 'merchant' }
      ];
      lastOutboundMockVal = { audience: 'merchant' };
      const payload = { phone: '+916232809817', message: 'Hi', type: 'message_received' };
      const req = createRequest(payload);

      const res = await POST(req);
      expect(res.status).toBe(200);
      const buildMerchantContext = require('@/lib/chat/merchantBuildContext').buildMerchantContext;
      expect(buildMerchantContext).toHaveBeenCalledWith(expect.anything(), 'merchant-1');
    });

    it('should route shared number to customer when last outbound log was customer', async () => {
      bindingsMockVal = [
        { user_id: 'customer-1', audience: 'customer' },
        { user_id: 'merchant-1', audience: 'merchant' }
      ];
      lastOutboundMockVal = { audience: 'customer' };
      const payload = { phone: '+916232809817', message: 'Hi', type: 'message_received' };
      const req = createRequest(payload);

      const res = await POST(req);
      expect(res.status).toBe(200);
      const buildMerchantContext = require('@/lib/chat/merchantBuildContext').buildMerchantContext;
      expect(buildMerchantContext).not.toHaveBeenCalledWith(expect.anything(), 'merchant-1');
    });

    it('should route shared number to customer when #personal override prefix is used', async () => {
      bindingsMockVal = [
        { user_id: 'customer-1', audience: 'customer' },
        { user_id: 'merchant-1', audience: 'merchant' }
      ];
      lastOutboundMockVal = { audience: 'merchant' };
      const payload = { phone: '+916232809817', message: '#personal check balance', type: 'message_received' };
      const req = createRequest(payload);

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendWhatsAppMessage).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('wallet balance'));
    });

    it('should route shared number to merchant when #store override prefix is used', async () => {
      bindingsMockVal = [
        { user_id: 'customer-1', audience: 'customer' },
        { user_id: 'merchant-1', audience: 'merchant' }
      ];
      lastOutboundMockVal = { audience: 'customer' };
      const payload = { phone: '+916232809817', message: '#store my orders', type: 'message_received' };
      const req = createRequest(payload);

      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(mockSendWhatsAppMessage).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Recent Orders'));
    });
  });

