import { checkLayeredRateLimit } from '../lib/sharedRateLimit';

describe('sharedRateLimit channel handling', () => {
  let mockSupabaseAdmin;

  beforeEach(() => {
    mockSupabaseAdmin = {
      rpc: jest.fn().mockResolvedValue({ data: { allowed: true }, error: null })
    };
    jest.useFakeTimers().setSystemTime(new Date('2026-06-12T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should use whatsapp specific phone key when channel is whatsapp', async () => {
    const result = await checkLayeredRateLimit({
      supabaseAdmin: mockSupabaseAdmin,
      phone: '+919999999999',
      ip: '127.0.0.1',
      channel: 'whatsapp'
    });

    expect(result.allowed).toBe(true);
    // The keys requested should contain the wa specific phone key
    expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('check_rate_limit', expect.objectContaining({
      p_key: 'otp:phone:wa:+919999999999'
    }));
    // Should still check IP key
    expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('check_rate_limit', expect.objectContaining({
      p_key: 'otp:ip:127.0.0.1'
    }));
  });

  it('should use default SMS phone key when channel is sms or omitted', async () => {
    const resultSms = await checkLayeredRateLimit({
      supabaseAdmin: mockSupabaseAdmin,
      phone: '+919999999999',
      ip: '127.0.0.1',
      channel: 'sms'
    });

    expect(resultSms.allowed).toBe(true);
    expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('check_rate_limit', expect.objectContaining({
      p_key: 'otp:phone:+919999999999'
    }));

    jest.clearAllMocks();

    const resultOmitted = await checkLayeredRateLimit({
      supabaseAdmin: mockSupabaseAdmin,
      phone: '+919999999999',
      ip: '127.0.0.1'
    });

    expect(resultOmitted.allowed).toBe(true);
    expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('check_rate_limit', expect.objectContaining({
      p_key: 'otp:phone:+919999999999'
    }));
  });
});
