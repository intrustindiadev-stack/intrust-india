import { POST } from '../app/api/merchant/auto-mode/route';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

// Mock dependencies
jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn()
}));

const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

describe('Auto Mode Toggle API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup mock chain for Supabase
        createAdminClient.mockReturnValue({
            from: mockFrom.mockReturnValue({
                select: mockSelect.mockReturnValue({
                    eq: mockEq.mockReturnValue({
                        single: mockSingle
                    })
                }),
                update: mockUpdate.mockReturnValue({
                    eq: mockEq.mockResolvedValue({ error: null })
                })
            }),
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-admin' } }, error: null })
            }
        });
        
        mockSingle.mockResolvedValue({
            data: {
                id: 'merchant-123',
                auto_mode: false,
                subscription_status: 'active',
                subscription_expires_at: '2026-12-31T23:59:59Z'
            },
            error: null
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

        // Verify that the update ONLY touched auto_mode boolean
        expect(mockUpdate).toHaveBeenCalledWith({
            auto_mode: true
        });

        // Ensure we did not mutate subscription details
        const updateCallArgs = mockUpdate.mock.calls[0][0];
        expect(updateCallArgs).not.toHaveProperty('subscription_expires_at');
        expect(updateCallArgs).not.toHaveProperty('subscription_status');
    });
});
