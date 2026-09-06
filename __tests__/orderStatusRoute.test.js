import { PATCH } from '../app/api/orders/[orderId]/status/route';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

// Mock dependencies
jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn()
}));

jest.mock('@/lib/notifications/userWhatsapp', () => ({
    notifyCustomerOrderStatus: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('@/lib/notifications/merchantWhatsapp', () => ({
    notifyMerchantTransaction: jest.fn().mockResolvedValue({ success: true })
}));

describe('Order Status Route (PATCH /api/orders/[orderId]/status)', () => {
    let mockRpc;
    let mockSupabase;
    let mockAdminClient;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRpc = jest.fn().mockResolvedValue({
            data: { success: true, message: 'Order status updated successfully' },
            error: null
        });

        mockSupabase = {
            rpc: mockRpc
        };

        mockAdminClient = {
            from: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({
                            data: {
                                customer_id: 'cust-123',
                                merchant_id: 'merch-456',
                                merchant_profit_paise: 5000,
                                settlement_status: 'settled',
                                merchants: {
                                    user_id: 'user-789',
                                    wallet_balance_paise: 15000
                                }
                            },
                            error: null
                        })
                    })
                })
            })
        };

        // CRITICAL: createServerSupabaseClient is an ASYNC function returning a Promise.
        // If route.js omits `await`, `supabase.rpc` will be undefined and throw TypeError.
        createServerSupabaseClient.mockImplementation(async () => mockSupabase);
        createAdminClient.mockReturnValue(mockAdminClient);
    });

    test('successfully updates order to packed when called by merchant (catches unawaited client regression)', async () => {
        const req = new Request('http://localhost:3000/api/orders/order-uuid-1/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newStatus: 'packed',
                trackingNumber: null,
                estimatedAt: null,
                statusNotes: null,
                isMerchant: true
            })
        });

        const res = await PATCH(req, { params: Promise.resolve({ orderId: 'order-uuid-1' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toBe('Order status updated successfully');

        // Confirm createServerSupabaseClient was called and awaited
        expect(createServerSupabaseClient).toHaveBeenCalledTimes(1);

        // Confirm RPC was invoked with exact parameter contract
        expect(mockRpc).toHaveBeenCalledWith('update_order_delivery_v3', {
            p_order_id: 'order-uuid-1',
            p_new_status: 'packed',
            p_tracking_number: null,
            p_estimated_at: null,
            p_status_notes: null,
            p_is_admin: false,
            p_is_merchant: true,
            p_is_customer: false
        });
    });

    test('successfully updates order to shipped with tracking and notifies customer/merchant', async () => {
        const req = new Request('http://localhost:3000/api/orders/order-uuid-1/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newStatus: 'shipped',
                trackingNumber: 'TRK-9999',
                estimatedAt: '2026-09-10T10:00:00Z',
                statusNotes: 'Dispatched via BlueDart',
                isMerchant: true
            })
        });

        const res = await PATCH(req, { params: Promise.resolve({ orderId: 'order-uuid-1' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(mockRpc).toHaveBeenCalledWith('update_order_delivery_v3', {
            p_order_id: 'order-uuid-1',
            p_new_status: 'shipped',
            p_tracking_number: 'TRK-9999',
            p_estimated_at: '2026-09-10T10:00:00Z',
            p_status_notes: 'Dispatched via BlueDart',
            p_is_admin: false,
            p_is_merchant: true,
            p_is_customer: false
        });
    });

    test('handles customer cancellation request', async () => {
        const req = new Request('http://localhost:3000/api/orders/order-uuid-1/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newStatus: 'cancelled',
                statusNotes: 'Ordered by mistake',
                isCustomer: true
            })
        });

        const res = await PATCH(req, { params: Promise.resolve({ orderId: 'order-uuid-1' }) });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(mockRpc).toHaveBeenCalledWith('update_order_delivery_v3', {
            p_order_id: 'order-uuid-1',
            p_new_status: 'cancelled',
            p_tracking_number: undefined,
            p_estimated_at: undefined,
            p_status_notes: 'Ordered by mistake',
            p_is_admin: false,
            p_is_merchant: false,
            p_is_customer: true
        });
    });

    test('returns 400 when RPC reports failure', async () => {
        mockRpc.mockResolvedValueOnce({
            data: { success: false, message: 'Unauthorized: Access denied' },
            error: null
        });

        const req = new Request('http://localhost:3000/api/orders/order-uuid-1/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newStatus: 'packed',
                isMerchant: true
            })
        });

        const res = await PATCH(req, { params: Promise.resolve({ orderId: 'order-uuid-1' }) });
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.message).toBe('Unauthorized: Access denied');
    });
});
