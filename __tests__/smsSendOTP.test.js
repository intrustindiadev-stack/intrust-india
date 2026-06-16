import { sendOTP } from '../lib/smsClient.js';
import { normalizePhone, formatPhoneForSMS } from '../lib/phoneUtils.js';

describe('SMS India Hub OTP formatting and send check', () => {
  let originalFetch;

  beforeAll(() => {
    process.env.SMSINDIAHUB_USER = 'test_user';
    process.env.SMSINDIAHUB_PASSWORD = 'test_password';
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
    delete process.env.SMSINDIAHUB_USER;
    delete process.env.SMSINDIAHUB_PASSWORD;
  });

  function mockResponse(status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
      json: jest.fn().mockResolvedValue(body),
    });
  }

  describe('normalizePhone', () => {
    it('should correctly normalize standard 10 digit number', () => {
      const { cleanPhone, isValid } = normalizePhone('9516524044');
      expect(cleanPhone).toBe('9516524044');
      expect(isValid).toBe(true);
    });

    it('should correctly normalize number with leading +91', () => {
      const { cleanPhone, isValid } = normalizePhone('+919516524044');
      expect(cleanPhone).toBe('9516524044');
      expect(isValid).toBe(true);
    });

    it('should correctly normalize number with leading 0', () => {
      const { cleanPhone, isValid } = normalizePhone('09516524044');
      expect(cleanPhone).toBe('9516524044');
      expect(isValid).toBe(true);
    });

    it('should identify invalid numbers', () => {
      const { isValid } = normalizePhone('12345');
      expect(isValid).toBe(false);
    });
  });

  describe('formatPhoneForSMS', () => {
    it('should format standard 10 digit number with 91 prefix', () => {
      expect(formatPhoneForSMS('9516524044')).toBe('919516524044');
    });

    it('should format number with +91 prefix with 91 prefix', () => {
      expect(formatPhoneForSMS('+919516524044')).toBe('919516524044');
    });

    it('should format number with 0 prefix with 91 prefix', () => {
      expect(formatPhoneForSMS('09516524044')).toBe('919516524044');
    });
  });

  describe('sendOTP', () => {
    it('should call fetch with the correct query parameters and 91 prefixed msisdn', async () => {
      mockResponse(200, { ErrorCode: '000', ErrorMessage: 'Done' });

      const phone = '9516524044';
      const otp = '123456';
      
      const result = await sendOTP(phone, otp);
      
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      const calledUrl = new URL(global.fetch.mock.calls[0][0]);
      expect(calledUrl.origin).toBe('http://cloud.smsindiahub.in');
      expect(calledUrl.pathname).toBe('/vendorsms/pushsms.aspx');
      expect(calledUrl.searchParams.get('user')).toBe('test_user');
      expect(calledUrl.searchParams.get('password')).toBe('test_password');
      expect(calledUrl.searchParams.get('msisdn')).toBe('919516524044');
      expect(calledUrl.searchParams.get('msg')).toContain('123456');
    });

    it('should work when phone starts with +91', async () => {
      mockResponse(200, { ErrorCode: '000', ErrorMessage: 'Done' });

      const phone = '+919516524044';
      const otp = '123456';

      const result = await sendOTP(phone, otp);

      expect(result.success).toBe(true);
      const calledUrl = new URL(global.fetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('msisdn')).toBe('919516524044');
    });

    it('should work when phone starts with 0', async () => {
      mockResponse(200, { ErrorCode: '000', ErrorMessage: 'Done' });

      const phone = '09516524044';
      const otp = '123456';

      const result = await sendOTP(phone, otp);

      expect(result.success).toBe(true);
      const calledUrl = new URL(global.fetch.mock.calls[0][0]);
      expect(calledUrl.searchParams.get('msisdn')).toBe('919516524044');
    });
  });
});
