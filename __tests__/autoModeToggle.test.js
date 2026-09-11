import { GET, POST } from '../app/api/merchant/auto-mode/route';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

// Mock dependencies
jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn()
}));

jest.mock('@/app/(admin)/admin/settings/actions', () => ({
    getPricingSettings: jest.fn().mockResolvedValue({
        autoFirst: 999,
        autoRenewal: 1999
    })
}));

const mockUpdate = jest.fn();
const mockSelectEq = jest.fn();
const mockUpdateEq = jest.fn();
const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockIn = jest.fn();
const mockRpc = jest.fn();

const chainSelect = {
    eq: mockSelectEq,
    in: mockIn,
    single: mockSingle,
    maybeSingle: mockSingle
};

describe('Auto Mode Toggle API', () => {
    let merchantData = {};

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSelectEq.mockReturnValue(chainSelect);
        mockIn.mockResolvedValue({ data: [], error: null });
        
        mockRpc.mockResolvedValue({
            data: {
                success: true,
                message: 'Auto Mode activated successfully',
                new_balance: 5000,
                valid_until: '2026-12-31T23:59:59Z'
            },
            error: null
        });

        mockFrom.mockReturnValue({
            select: mockSelect.mockReturnValue(chainSelect),
            update: mockUpdate.mockReturnValue({
                eq: mockUpdateEq.mockResolvedValue({ error: null })
            })
        });

        const mockSupabase = {
            from: mockFrom,
            rpc: mockRpc,
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null })
            }
        };

        createAdminClient.mockReturnValue(mockSupabase);
        createServerSupabaseClient.mockReturnValue(mockSupabase);
        
        // Default merchant with active subscription valid until 2099
        merchantData = {
            id: 'merchant-123',
            user_id: 'test-user-id',
            business_name: 'Test Store',
            auto_mode: false,
            auto_mode_status: 'inactive',
            subscription_status: 'active',
            subscription_expires_at: '2099-12-31T23:59:59Z',
            auto_mode_months_paid: 0,
            auto_mode_valid_until: '2099-12-31T23:59:59Z',
            wallet_balance_paise: 500000
        };

        mockSingle.mockImplementation(async () => {
            const lastTable = mockFrom.mock.calls[mockFrom.mock.calls.length - 1]?.[0];
            if (lastTable === 'user_profiles') {
                return {
                    data: {
                        role: 'merchant'
                    },
                    error: null
                };
            }
            return {
                data: { ...merchantData },
                error: null
            };
        });
    });

    it('toggle auto_mode activate with active subscription -> re-activates without charging', async () => {
        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            json: async () => ({ action: 'activate' })
        };

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.is_active).toBe(true);

        // Verify that update was called with active
        expect(mockUpdate).toHaveBeenCalledWith({
            auto_mode: true,
            auto_mode_status: 'active'
        });

        // Ensure subscription columns were not mutated
        const updateCallArgs = mockUpdate.mock.calls[0][0];
        expect(updateCallArgs).not.toHaveProperty('subscription_expires_at');
        expect(updateCallArgs).not.toHaveProperty('subscription_status');
        expect(mockRpc).not.toHaveBeenCalled();
    });

    it('toggle auto_mode activate when expired -> charges via atomic RPC', async () => {
        // Lapsed subscription in 2025
        merchantData.auto_mode_valid_until = '2025-01-01T00:00:00Z';
        merchantData.auto_mode = false;
        merchantData.auto_mode_months_paid = 1;

        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            json: async () => ({ action: 'activate' })
        };

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.is_active).toBe(true);

        // Verify atomic RPC was invoked with renewal price
        expect(mockRpc).toHaveBeenCalledWith('merchant_activate_auto_mode', {
            p_merchant_id: 'merchant-123',
            p_price_paise: 199900,
            p_description: 'Auto Mode Subscription (1999 INR)'
        });
    });

    it('toggle auto_mode activate when expired but auto_mode boolean is true -> allows renewal instead of 400 blocking', async () => {
        // Bug #2 regression test: auto_mode was left true from past cycle, but expired
        merchantData.auto_mode_valid_until = '2025-01-01T00:00:00Z';
        merchantData.auto_mode = true;
        merchantData.auto_mode_months_paid = 1;

        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            json: async () => ({ action: 'activate' })
        };

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockRpc).toHaveBeenCalled();
    });

    it('toggle auto_mode activate when already active and unexpired -> returns 400', async () => {
        merchantData.auto_mode = true;
        merchantData.auto_mode_valid_until = '2099-12-31T23:59:59Z';

        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            json: async () => ({ action: 'activate' })
        };

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('Auto Mode is already active');
    });

    it('toggle auto_mode deactivate -> sets auto_mode = false and status = inactive', async () => {
        merchantData.auto_mode = true;
        merchantData.auto_mode_status = 'active';

        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            json: async () => ({ action: 'deactivate' })
        };

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.is_active).toBe(false);

        expect(mockUpdate).toHaveBeenCalledWith({
            auto_mode: false,
            auto_mode_status: 'inactive'
        });
    });

    it('GET /api/merchant/auto-mode -> returns authoritative server state', async () => {
        merchantData.auto_mode = true;
        merchantData.auto_mode_valid_until = '2099-12-31T23:59:59Z';

        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            url: 'http://localhost:3000/api/merchant/auto-mode'
        };

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.merchant_id).toBe('merchant-123');
        expect(data.is_active).toBe(true);
        expect(data.has_valid_sub).toBe(true);
    });

    it('GET /api/merchant/auto-mode when expired -> reports is_active as false', async () => {
        merchantData.auto_mode = true;
        merchantData.auto_mode_valid_until = '2025-01-01T00:00:00Z'; // expired

        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            url: 'http://localhost:3000/api/merchant/auto-mode'
        };

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.is_active).toBe(false);
        expect(data.has_valid_sub).toBe(false);
    });
});
