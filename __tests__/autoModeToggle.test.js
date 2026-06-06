import { POST } from '../app/api/merchant/auto-mode/route';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

// Mock dependencies
jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn()
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
    beforeEach(() => {
        jest.clearAllMocks();
        
        mockSelectEq.mockReturnValue(chainSelect);
        mockIn.mockResolvedValue({ data: [], error: null });
        
        mockRpc.mockResolvedValue({
            data: {
                success: true,
                message: 'Auto Mode activated',
                new_balance: 0,
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
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } }, error: null })
            }
        };

        createAdminClient.mockReturnValue(mockSupabase);
        createServerSupabaseClient.mockReturnValue(mockSupabase);
        
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
                data: {
                    id: 'merchant-123',
                    auto_mode: false,
                    subscription_status: 'active',
                    subscription_expires_at: '2026-12-31T23:59:59Z',
                    auto_mode_months_paid: 0,
                    auto_mode_valid_until: '2026-12-31T23:59:59Z'
                },
                error: null
            };
        });
    });

    it('toggle auto_mode -> subscription end date unchanged', async () => {
        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            json: async () => ({ action: 'activate' })
        };

        const res = await POST(req);
        const data = await res.json();

        // Check response indicates success
        expect(res.status).toBe(200);
        expect(data.success).toBe(true);

        // Verify that the update ONLY touched auto_mode and auto_mode_status
        expect(mockUpdate).toHaveBeenCalledWith({
            auto_mode: true,
            auto_mode_status: 'active'
        });

        // Ensure we did not mutate subscription details
        const updateCallArgs = mockUpdate.mock.calls[0][0];
        expect(updateCallArgs).not.toHaveProperty('subscription_expires_at');
        expect(updateCallArgs).not.toHaveProperty('subscription_status');
    });
});
