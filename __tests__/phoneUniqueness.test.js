import { POST as signupOtpHandler } from '../app/api/auth/signup-otp/route';
import { POST as verifyPhoneHandler } from '../app/api/auth/verify-phone/route';
import { POST as emailSignupHandler } from '../app/api/auth/email/signup/route';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';

const mockRpc = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn();
const mockSingle = jest.fn();

const mockClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: mockSingle,
  rpc: mockRpc,
  auth: {
    admin: {
      getUserById: mockGetUserById,
      updateUserById: mockUpdateUserById,
      createUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'new-user-uuid' } },
        error: null
      })
    },
    verifyOtp: jest.fn().mockResolvedValue({
      data: {
        session: { access_token: 'fake-token', refresh_token: 'fake-refresh' },
        user: { id: 'new-user-uuid' }
      },
      error: null
    })
  }
};

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(() => mockClient),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockClient),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockClient),
}));

jest.mock('@/lib/otpUtils', () => ({
  hashOTP: jest.fn(() => 'mock-hash'),
  normalizePhone: jest.fn((phone) => ({ cleanPhone: '9999988888', formattedPhone: '+919999988888', isValid: true })),
  getStablePhoneEmail: jest.fn((phone) => `p${phone}@phone.intrust.internal`)
}));

jest.mock('@/lib/otpHmac', () => ({
  verifyOTPHash: jest.fn(() => true)
}));

jest.mock('@/lib/whatsapp/ensureBinding', () => ({
  ensureWhatsAppBinding: jest.fn().mockResolvedValue({}),
}));

describe('One-Phone-One-Account Guarantees & Uniqueness Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('SIGNUP-OTP Duplicate Phone rejection', () => {
    it('should reject signup with 409 when the phone is already linked to another account', async () => {
      // 1. Mock OTP verification to succeed
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'otp-id',
          phone: '+919999988888',
          otp_hash: 'mock-hash',
          expires_at: new Date(Date.now() + 100000).toISOString(),
          attempts: 0,
          max_attempts: 5,
          is_used: false
        },
        error: null
      });

      // 2. Mock OTP claim update to succeed
      mockClient.update.mockReturnValueOnce({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValueOnce({
          data: [{ id: 'otp-id' }],
          error: null
        })
      });

      // 3. Mock get_user_id_by_phone RPC to return an existing user ID (collision)
      mockRpc.mockResolvedValueOnce({ data: 'existing-user-uuid', error: null });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456', full_name: 'New User' });
      const res = await signupOtpHandler(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('Account already exists. Please log in instead.');
      expect(json.code).toBe('ACCOUNT_EXISTS');
    });
  });

  describe('VERIFY-PHONE Phone Link uniqueness checks', () => {
    it('should reject linking a phone with 409 if it is already registered to a different account', async () => {
      // 1. Mock OTP verification to succeed
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'otp-id',
          phone: '+919999988888',
          otp_hash: 'mock-hash',
          expires_at: new Date(Date.now() + 100000).toISOString(),
          attempts: 0,
          max_attempts: 5,
          is_used: false
        },
        error: null
      });

      // 2. Mock get_user_id_by_phone RPC to return a different user ID (collision)
      mockRpc.mockResolvedValueOnce({ data: 'different-user-uuid', error: null });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456', userId: 'current-user-uuid' });
      const res = await verifyPhoneHandler(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('This phone number is already registered to a different account. To use this number, please sign in with this mobile number instead.');
      expect(json.code).toBe('PHONE_EXISTS_OTHER_ACCOUNT');
    });

    it('should allow linking a phone if it is already registered to the SAME account', async () => {
      // 1. Mock OTP verification to succeed
      mockSingle.mockResolvedValueOnce({
        data: {
          id: 'otp-id',
          phone: '+919999988888',
          otp_hash: 'mock-hash',
          expires_at: new Date(Date.now() + 100000).toISOString(),
          attempts: 0,
          max_attempts: 5,
          is_used: false
        },
        error: null
      });

      // 2. Mock get_user_id_by_phone RPC to return the same user ID (no collision)
      mockRpc.mockResolvedValueOnce({ data: 'current-user-uuid', error: null });

      // 3. Mock getUserById to return current user
      mockGetUserById.mockResolvedValueOnce({
        data: { user: { id: 'current-user-uuid', phone: '+919999988888' } },
        error: null
      });

      // 4. Mock profiles update
      mockClient.update.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: null })
      });

      // 5. Mock consuming OTP
      mockClient.update.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValueOnce({ error: null })
      });

      const req = makeMockRequest({ phone: '9999988888', otp: '123456', userId: 'current-user-uuid' });
      const res = await verifyPhoneHandler(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.phone).toBe('+919999988888');
    });
  });

  describe('EMAIL-SIGNUP Duplicate Phone rejection', () => {
    it('should reject email signup with 409 when the phone is already linked to another account', async () => {
      // 1. Mock get_user_id_by_phone RPC to return an existing user ID (collision)
      mockRpc.mockResolvedValueOnce({ data: 'existing-user-uuid', error: null });

      const req = makeMockRequest({ 
        email: 'new@example.com', 
        password: 'Password123', 
        full_name: 'New User', 
        phone: '9999988888', 
        otp: '123456' 
      });
      const res = await emailSignupHandler(req);

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe('Phone number already registered');
      expect(json.code).toBe('PHONE_EXISTS');
    });
  });
});
