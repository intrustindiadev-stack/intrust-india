import { POST as verifyOtpHandler } from '../app/api/auth/verify-otp/route';
import { POST as signupOtpHandler } from '../app/api/auth/signup-otp/route';

let mockSupabase;

function buildMockSupabase() {
  const client = {
    from: jest.fn().mockImplementation(() => client),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: 'otp-id-123',
        phone: '+919999988888',
        otp_hash: 'mock-hash',
        pepper_hash: 'mock-pepper-hash',
        expires_at: new Date(Date.now() + 100000).toISOString(),
        attempts: 0,
        max_attempts: 5,
        is_used: false
      },
      error: null
    }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation(function(onfulfilled) {
      return Promise.resolve({
        data: [{ id: 'user-id-123' }],
        error: null
      }).then(onfulfilled);
    }),
    rpc: jest.fn().mockResolvedValue({ data: 'user-id-123', error: null }),
    auth: {
      admin: {
        getUserById: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-id-123', email: 'test@example.com' } },
          error: null
        }),
        createUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-id-123' } },
          error: null
        }),
        generateLink: jest.fn(),
        updateUserById: jest.fn().mockResolvedValue({ data: {}, error: null })
      },
      verifyOtp: jest.fn(),
      setSession: jest.fn().mockResolvedValue({ data: {}, error: null })
    }
  };
  return client;
}

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(() => mockSupabase),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabase),
}));

jest.mock('@/lib/whatsapp/ensureBinding', () => ({
  ensureWhatsAppBinding: jest.fn().mockResolvedValue({ isNewLink: true })
}));

jest.mock('@/lib/notifications/authWhatsapp', () => ({
  sendWhatsAppLoginAlert: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/lib/supabaseCookieHelper', () => ({
  applySupabaseCookies: jest.fn(),
}));

jest.mock('@/lib/otpHmac', () => ({
  verifyOTPHash: jest.fn(() => true),
}));

jest.mock('@/lib/otpUtils', () => ({
  normalizePhone: jest.fn((phone) => ({
    cleanPhone: '9999988888',
    formattedPhone: '+919999988888',
    isValid: true
  })),
  getStablePhoneEmail: jest.fn((phone) => `p${phone}@phone.intrust.internal`),
}));

describe('Session Minting Hardening and Retry Tests', () => {
  beforeAll(() => {
    jest.spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
  });

  afterAll(() => {
    global.setTimeout.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = buildMockSupabase();
  });

  const makeMockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn().mockImplementation((name) => {
        if (name.toLowerCase() === 'user-agent') return 'test-user-agent';
        return null;
      })
    },
    cookies: {
      getAll: () => []
    }
  });

  describe('VERIFY-OTP Route', () => {
    it('should retry generateLink and succeed if subsequent try succeeds', async () => {
      mockSupabase.auth.admin.generateLink
        .mockResolvedValueOnce({ data: null, error: { message: 'Transient rate limit' } })
        .mockResolvedValueOnce({ data: { properties: { hashed_token: 'valid-token' } }, error: null });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { session: { access_token: 'acc', refresh_token: 'ref' }, user: { id: 'user-id-123' } },
        error: null
      });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);

      expect(res.status).toBe(200);
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledTimes(2);
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledTimes(1);

      // Verify success audit log was written
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_mint_success'
        })
      );
    });

    it('should retry verifyOtp and succeed if subsequent try succeeds', async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'valid-token' } },
        error: null
      });

      mockSupabase.auth.verifyOtp
        .mockResolvedValueOnce({ data: null, error: { message: 'GoTrue internal error' } })
        .mockResolvedValueOnce({ data: { session: { access_token: 'acc', refresh_token: 'ref' }, user: { id: 'user-id-123' } }, error: null });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);

      expect(res.status).toBe(200);
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledTimes(1);
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledTimes(2);
    });

    it('should fail with LINK_GENERATION_FAILED code after exhausting all 3 attempts of generateLink', async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { message: 'Persistent database connection error' }
      });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('LINK_GENERATION_FAILED');
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledTimes(3);

      // Verify failure audit log was written
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_mint_failed',
          metadata: expect.objectContaining({
            error_step: 'link_generation'
          })
        })
      );

      // Verify OTP is_used was rolled back to false
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_used: false });
    });

    it('should fail with TOKEN_EXCHANGE_FAILED code after exhausting all 3 attempts of verifyOtp', async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'valid-token' } },
        error: null
      });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Persistent GoTrue exchange timeout' }
      });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('TOKEN_EXCHANGE_FAILED');
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledTimes(3);

      // Verify failure audit log was written
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_mint_failed',
          metadata: expect.objectContaining({
            error_step: 'token_exchange'
          })
        })
      );

      // Verify OTP is_used was rolled back to false
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_used: false });
    });

    it('should fail with COOKIE_SET_FAILED when cookie setting throws an error', async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'valid-token' } },
        error: null
      });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { session: { access_token: 'acc', refresh_token: 'ref' }, user: { id: 'user-id-123' } },
        error: null
      });

      mockSupabase.auth.setSession.mockRejectedValue(new Error('Browser cookie store blocked'));

      const req = makeMockRequest({ phone: '9999988888', otp: '123456' });
      const res = await verifyOtpHandler(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('COOKIE_SET_FAILED');

      // Verify failure audit log was written
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_mint_failed',
          metadata: expect.objectContaining({
            error_step: 'cookie_set'
          })
        })
      );

      // Verify OTP is_used was rolled back to false
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_used: false });
    });
  });

  describe('SIGNUP-OTP Route', () => {
    beforeEach(() => {
      // For signup, rpc 'get_user_id_by_phone' should return null first (no account exists)
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
    });

    it('should retry generateLink and succeed if subsequent try succeeds', async () => {
      mockSupabase.auth.admin.generateLink
        .mockResolvedValueOnce({ data: null, error: { message: 'Transient rate limit' } })
        .mockResolvedValueOnce({ data: { properties: { hashed_token: 'valid-token' } }, error: null });

      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { session: { access_token: 'acc', refresh_token: 'ref' }, user: { id: 'user-id-123' } },
        error: null
      });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456', full_name: 'John Doe' });
      const res = await signupOtpHandler(req);

      expect(res.status).toBe(200);
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledTimes(2);
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledTimes(1);

      // Verify success audit log was written
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_mint_success'
        })
      );
    });

    it('should fail with LINK_GENERATION_FAILED code after exhausting all 3 attempts of generateLink', async () => {
      mockSupabase.auth.admin.generateLink.mockResolvedValue({
        data: null,
        error: { message: 'Persistent database connection error' }
      });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456', full_name: 'John Doe' });
      const res = await signupOtpHandler(req);
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.code).toBe('LINK_GENERATION_FAILED');
      expect(mockSupabase.auth.admin.generateLink).toHaveBeenCalledTimes(3);

      // Verify failure audit log was written
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'session_mint_failed',
          metadata: expect.objectContaining({
            error_step: 'link_generation'
          })
        })
      );

      // Verify OTP is_used was rolled back to false
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_used: false });
    });
  });
});
