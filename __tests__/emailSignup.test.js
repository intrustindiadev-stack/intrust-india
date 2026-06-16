import { POST as emailSignupHandler } from '../app/api/auth/email/signup/route';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-supabase-url.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-role-key';

const mockRpc = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUserById = jest.fn();
const mockDeleteUser = jest.fn();
const mockSingle = jest.fn();
const mockSignUp = jest.fn();

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
      deleteUser: mockDeleteUser
    },
    signUp: mockSignUp
  }
};

jest.mock('@/lib/supabaseServer', () => ({
  createAdminClient: jest.fn(() => mockClient),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockClient),
}));

jest.mock('@/lib/phoneUtils', () => ({
  normalizePhone: jest.fn((phone) => ({ cleanPhone: '9999988888', formattedPhone: '+919999988888', isValid: true }))
}));

jest.mock('@/lib/otpHmac', () => ({
  verifyOTPHash: jest.fn(() => true)
}));

describe('Email Signup with Mobile Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeMockRequest = (body) => ({
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn().mockImplementation((name) => null)
    }
  });

  it('valid OTP -> user created and phone attached', async () => {
    // 1. Phone Uniqueness (no collision)
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    // 2. Mock OTP verification
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

    // 3. Mock OTP claim
    mockClient.update.mockReturnValueOnce({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValueOnce({
        data: [{ id: 'otp-id' }],
        error: null
      })
    });

    // 4. Email uniqueness (no collision)
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    // 5. Anon signUp succeeds
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'new-user-uuid' } },
      error: null
    });

    // 6. Update user (attach phone) succeeds
    mockUpdateUserById.mockResolvedValueOnce({ data: { user: { id: 'new-user-uuid' } }, error: null });

    // 7. Update profile (attach phone) succeeds
    mockClient.update.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValueOnce({ error: null })
    });

    // 8. Delete OTP
    mockClient.delete.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValueOnce({ error: null })
    });

    // 9. Audit log
    mockClient.insert.mockResolvedValueOnce({ error: null });

    const req = makeMockRequest({ email: 'new@example.com', password: 'Password123', full_name: 'New User', phone: '9999988888', otp: '123456' });
    const res = await emailSignupHandler(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // Assert update was called with phone
    expect(mockUpdateUserById).toHaveBeenCalledWith('new-user-uuid', {
      phone: '+919999988888',
      phone_confirm: true
    });
  });

  it('invalid OTP -> 400 and no user created', async () => {
    // 1. Phone Uniqueness (no collision)
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    // 2. Mock OTP verification with false verifyOTPHash
    const { verifyOTPHash } = require('@/lib/otpHmac');
    verifyOTPHash.mockReturnValueOnce(false);

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

    // 3. Mock updating attempts
    mockClient.update.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValueOnce({ error: null })
    });

    const req = makeMockRequest({ email: 'new@example.com', password: 'Password123', full_name: 'New User', phone: '9999988888', otp: 'wrong1' });
    const res = await emailSignupHandler(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe('OTP_INVALID');

    // Assert signUp was not called
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('phone-attach failure -> deleteUser rollback so no orphan remains', async () => {
    // 1. Phone Uniqueness (no collision)
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    // 2. Mock OTP verification
    const { verifyOTPHash } = require('@/lib/otpHmac');
    verifyOTPHash.mockReturnValueOnce(true);
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

    // 3. Mock OTP claim
    mockClient.update.mockReturnValueOnce({
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValueOnce({
        data: [{ id: 'otp-id' }],
        error: null
      })
    });

    // 4. Email uniqueness (no collision)
    mockRpc.mockResolvedValueOnce({ data: null, error: null });

    // 5. Anon signUp succeeds
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'new-user-uuid' } },
      error: null
    });

    // 6. Update user (attach phone) FAILS
    mockUpdateUserById.mockResolvedValueOnce({ data: null, error: new Error('Phone already exists') });

    // 7. Mock rolling back claimed OTP
    mockClient.update.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValueOnce({ error: null })
    });

    const req = makeMockRequest({ email: 'new@example.com', password: 'Password123', full_name: 'New User', phone: '9999988888', otp: '123456' });
    const res = await emailSignupHandler(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.code).toBe('PHONE_EXISTS');

    // Assert deleteUser was called
    expect(mockDeleteUser).toHaveBeenCalledWith('new-user-uuid');
  });
});
