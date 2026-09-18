import { POST } from '../app/api/shopping/notify-order/route';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn()
}));

jest.mock('@/lib/notifications/userWhatsapp', () => ({
    notifyCustomerOrderStatus: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('@/lib/notifications/merchantWhatsapp', () => ({
    notifyMerchantNewOrder: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('@/lib/email', () => ({
    sendCustomerOrderEmail: jest.fn().mockResolvedValue(true),
    sendAdminAlert: jest.fn().mockResolvedValue(true),
    sendMerchantAlert: jest.fn().mockResolvedValue(true)
}));

jest.mock('@/lib/email/dispatch', () => ({
    fireAndForgetEmail: jest.fn((fn) => fn().catch(() => {}))
}));

describe('Notify Order Route (POST /api/shopping/notify-order)', () => {
    let mockAdmin;
    let mockUserSupabase;

    beforeEach(() => {
        jest.clearAllMocks();

        const createMockQuery = (resolvedData) => {
            const query = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                not: jest.fn().mockReturnThis(),
                in: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: resolvedData, error: null }),
                maybeSingle: jest.fn().mockResolvedValue({ data: resolvedData, error: null }),
                insert: jest.fn().mockResolvedValue({ error: null })
            };
            return query;
        };

        mockAdmin = {
            from: jest.fn((table) => {
                if (table === 'shopping_order_groups') {
                    return createMockQuery({ id: 'group-uuid-1234-5678', status: 'completed', customer_id: 'cust-abc-123' });
                }
                if (table === 'notifications') {
                    return createMockQuery(null);
                }
                if (table === 'user_profiles') {
                    return createMockQuery({ email: 'cust@example.com', full_name: 'John Doe' });
                }
                if (table === 'shopping_order_items') {
                    const q = createMockQuery(null);
                    q.not = jest.fn().mockResolvedValue({ data: [{ seller_id: 'merchant-id-1' }], error: null });
                    return q;
                }
                if (table === 'merchants') {
                    const q = createMockQuery(null);
                    q.in = jest.fn().mockResolvedValue({ data: [{ id: 'merchant-id-1', user_id: 'merchant-user-1', business_name: 'Test Store' }], error: null });
                    return q;
                }
                return createMockQuery(null);
            })
        };

        mockUserSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'cust-abc-123' } },
                    error: null
                })
            }
        };

        createAdminClient.mockReturnValue(mockAdmin);
        createServerSupabaseClient.mockResolvedValue(mockUserSupabase);
    });

    test('dispatches WhatsApp confirmation to customer upon successful order notification', async () => {
        const { notifyCustomerOrderStatus } = require('@/lib/notifications/userWhatsapp');

        const req = new Request('http://localhost:3000/api/shopping/notify-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                group_id: 'group-uuid-1234-5678',
                amount_paise: 9900
            })
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(notifyCustomerOrderStatus).toHaveBeenCalledWith({
            userId: 'cust-abc-123',
            orderId: 'GROUP-UU',
            newStatus: 'Confirmed'
        });
    });
});
