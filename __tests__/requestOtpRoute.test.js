import { POST } from '../app/api/auth/request-otp/route';
import { createAdminClient } from '@/lib/supabaseServer';
import { generateOTP, normalizePhone, hashOTP } from '@/lib/otpUtils';
import { hmacOTP } from '@/lib/otpHmac';
import { sendOTP } from '@/lib/smsClient';
import { sendWhatsAppOtp } from '@/lib/notifications/otpWhatsapp';
import { checkLayeredRateLimit } from '@/lib/sharedRateLimit';
import { logAuthEvent } from '@/lib/authHelpers';

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/otpUtils', () => ({
  generateOTP: jest.fn(() => '123456'),
  normalizePhone: jest.fn((phone) => {
    if (phone === 'invalid') return { isValid: false };
    return { cleanPhone: '9999999999', formattedPhone: '+919999999999', isValid: true };
  }),
  hashOTP: jest.fn(() => 'legacy-hash'),
}));

jest.mock('@/lib/otpHmac', () => ({
  hmacOTP: jest.fn(() => 'pepper-hash'),
}));

jest.mock('@/lib/smsClient', () => ({
  sendOTP: jest.fn(),
}));

jest.mock('@/lib/notifications/otpWhatsapp', () => ({
  sendWhatsAppOtp: jest.fn(),
}));

jest.mock('@/lib/sharedRateLimit', () => ({
  checkLayeredRateLimit: jest.fn(),
}));

jest.mock('@/lib/authHelpers', () => ({
  logAuthEvent: jest.fn(),
  authError: jest.fn((msg, details, code, status) => {
    return { status, json: async () => ({ success: false, error: msg, code }) };
  }),
}));

describe('request-otp route handler', () => {
  let mockSupabase;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.WHATSAPP_OTP_ENABLED = 'true';

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockResolvedValue({ error: null })
    };
    createAdminClient.mockReturnValue(mockSupabase);

    checkLayeredRateLimit.mockResolvedValue({ allowed: true, consumedKeys: ['otp:phone:wa:+919999999999'] });
    sendWhatsAppOtp.mockResolvedValue({ success: true });
    sendOTP.mockResolvedValue({ success: true });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const makeRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    headers: new Map([
      ['x-forwarded-for', '127.0.0.1'],
      ['user-agent', 'jest-test']
    ])
  });

  it('should process WhatsApp channel when flag is ON', async () => {
    const req = makeRequest({ phone: '9999999999', channel: 'whatsapp' });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.channel).toBe('whatsapp');
    expect(sendWhatsAppOtp).toHaveBeenCalledWith('9999999999', '123456');
    expect(sendOTP).not.toHaveBeenCalled();
    expect(mockSupabase.insert).toHaveBeenCalled();
  });

  it('should reject WhatsApp channel when flag is OFF without creating OTP row', async () => {
    process.env.WHATSAPP_OTP_ENABLED = 'false';
    const req = makeRequest({ phone: '9999999999', channel: 'whatsapp' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.code).toBe('WHATSAPP_DISABLED');
    expect(sendWhatsAppOtp).not.toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it('should fallback to SMS when channel is omitted', async () => {
    const req = makeRequest({ phone: '9999999999' });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.channel).toBe('sms');
    expect(sendOTP).toHaveBeenCalledWith('9999999999', '123456');
    expect(sendWhatsAppOtp).not.toHaveBeenCalled();
  });

  it('should rollback and audit log if WhatsApp send fails', async () => {
    sendWhatsAppOtp.mockResolvedValue({ success: false, error: 'Network fail' });
    
    const req = makeRequest({ phone: '9999999999', channel: 'whatsapp' });
    const res = await POST(req);
    // Since we mocked authError to return a dummy response object:
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.code).toBe('WHATSAPP_FAILED');
    expect(mockSupabase.delete).toHaveBeenCalled(); // Should rollback DB
    expect(mockSupabase.rpc).toHaveBeenCalledWith('rollback_rate_limit', { p_key: 'otp:phone:wa:+919999999999' }); // Should rollback rate limit
    expect(logAuthEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'otp_send_failed' }));
  });
});
