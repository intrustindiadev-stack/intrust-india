import { GET } from '../app/api/merchant/auto-mode/analytics/route';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { isValidOrder, isSettledOrder, getPeriodBoundary } from '@/lib/merchant/orderMetrics';

jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn()
}));

describe('Auto Mode Analytics & Metrics Engine', () => {
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockGte = jest.fn();
    const mockOrder = jest.fn();
    const mockLimit = jest.fn();
    const mockSingle = jest.fn();

    let sampleOrders = [];

    beforeEach(() => {
        jest.clearAllMocks();

        sampleOrders = [
            {
                id: 'order-1',
                created_at: new Date().toISOString(),
                status: 'completed',
                delivery_status: 'delivered',
                payment_status: 'paid',
                payment_method: 'wallet',
                settlement_status: 'settled',
                total_amount_paise: 100000, // ₹1,000
                merchant_profit_paise: 20000, // ₹200
                platform_cut_paise: 5000,
            },
            {
                id: 'order-2',
                created_at: new Date().toISOString(),
                status: 'processing',
                delivery_status: 'shipped',
                payment_status: 'paid',
                payment_method: 'wallet',
                settlement_status: 'pending',
                total_amount_paise: 50000, // ₹500
                merchant_profit_paise: 10000, // ₹100 in-flight
                platform_cut_paise: 2500,
            },
            {
                id: 'order-3-failed',
                created_at: new Date().toISOString(),
                status: 'pending',
                delivery_status: 'pending',
                payment_status: 'failed', // Should be excluded from valid sales!
                payment_method: 'gateway',
                settlement_status: 'pending',
                total_amount_paise: 250000,
                merchant_profit_paise: 0,
                platform_cut_paise: 0,
            },
            {
                id: 'order-4-abandoned-draft',
                created_at: new Date().toISOString(),
                status: 'pending',
                delivery_status: 'pending',
                payment_status: 'pending',
                payment_method: 'gateway', // Abandoned gateway checkout draft!
                settlement_status: 'pending',
                total_amount_paise: 300000,
                merchant_profit_paise: 0,
                platform_cut_paise: 0,
            },
            {
                id: 'order-5-cancelled',
                created_at: new Date().toISOString(),
                status: 'cancelled',
                delivery_status: 'cancelled',
                payment_status: 'paid',
                payment_method: 'wallet',
                settlement_status: 'pending',
                total_amount_paise: 80000,
                merchant_profit_paise: 0,
                platform_cut_paise: 0,
            }
        ];

        mockLimit.mockResolvedValue({ data: sampleOrders, error: null });
        mockOrder.mockReturnValue({ limit: mockLimit });
        mockGte.mockReturnValue({ order: mockOrder });
        mockEq.mockReturnValue({ gte: mockGte });
        mockSelect.mockReturnValue({ eq: mockEq });

        mockSingle.mockResolvedValue({
            data: { id: 'merchant-test' },
            error: null
        });

        const mockSupabase = {
            from: (table) => {
                if (table === 'merchants') {
                    return {
                        select: () => ({ eq: () => ({ single: mockSingle }) })
                    };
                }
                return { select: mockSelect };
            },
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'user-test' } },
                    error: null
                })
            }
        };

        createAdminClient.mockReturnValue(mockSupabase);
        createServerSupabaseClient.mockReturnValue(mockSupabase);
    });

    it('isValidOrder correctly filters out failed and abandoned orders', () => {
        expect(isValidOrder(sampleOrders[0])).toBe(true); // delivered & paid
        expect(isValidOrder(sampleOrders[1])).toBe(true); // shipped & paid
        expect(isValidOrder(sampleOrders[2])).toBe(false); // failed payment
        expect(isValidOrder(sampleOrders[3])).toBe(false); // abandoned gateway draft
        expect(isValidOrder(sampleOrders[4])).toBe(false); // cancelled
    });

    it('isSettledOrder correctly identifies terminal settled profits', () => {
        expect(isSettledOrder(sampleOrders[0])).toBe(true); // settlement_status = 'settled'
        expect(isSettledOrder(sampleOrders[1])).toBe(false); // settlement_status = 'pending'
        expect(isSettledOrder(sampleOrders[4])).toBe(false); // cancelled
    });

    it('getPeriodBoundary computes valid IST boundaries without timezone skew', () => {
        const boundary = getPeriodBoundary('today');
        expect(boundary).toBeInstanceOf(Date);
        // Ensure boundary is at or before current time
        expect(boundary.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('GET /api/merchant/auto-mode/analytics returns authoritative summary metrics', async () => {
        const req = {
            headers: new Headers({
                'Authorization': 'Bearer test-token'
            }),
            url: 'http://localhost:3000/api/merchant/auto-mode/analytics?days=30'
        };

        const res = await GET(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.summary).toBeDefined();

        // Valid orders: order-1 (₹1000) and order-2 (₹500) -> total ₹1500 (150000 paise)
        expect(data.summary.totalOrders).toBe(2);
        expect(data.summary.totalGrossRevenue).toBe(150000);

        // Settled profit: only order-1 (₹200 -> 20000 paise)
        expect(data.summary.settledProfit).toBe(20000);

        // Contingent (in-flight) profit: order-2 (₹100 -> 10000 paise)
        expect(data.summary.contingentProfit).toBe(10000);

        // Delivered count: 1
        expect(data.summary.deliveredCount).toBe(1);

        // Success rate: delivered / (delivered + cancelled) = 1 / (1 + 1) = 50%
        expect(data.summary.successRate).toBe(50);
    });
});
