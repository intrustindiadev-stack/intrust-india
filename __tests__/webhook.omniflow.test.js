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
