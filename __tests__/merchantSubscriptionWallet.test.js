import { POST } from '@/app/api/merchant/subscription/pay-wallet/route';
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { notifyMerchantSubscriptionStatus } from '@/lib/notifications/merchantWhatsapp';

// Mock dependencies
jest.mock('@/lib/supabaseServer', () => ({
    createAdminClient: jest.fn(),
    createServerSupabaseClient: jest.fn()
}));

jest.mock('@/lib/notifications/merchantWhatsapp', () => ({
    notifyMerchantSubscriptionStatus: jest.fn().mockResolvedValue({ ok: true })
}));

describe('Merchant Subscription Pay-Wallet API', () => {
    let mockSupabase;
    let mockRpc;
    let mockFrom;
    let mockSelect;
    let mockMaybeSingle;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRpc = jest.fn();
        mockMaybeSingle = jest.fn();
        mockSelect = jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
                maybeSingle: mockMaybeSingle
            })
        });
        mockFrom = jest.fn().mockReturnValue({
            select: mockSelect
        });

        mockSupabase = {
            from: mockFrom,
            rpc: mockRpc,
            auth: {
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'user-merchant-123' } },
                    error: null
                })
            }
        };

        createAdminClient.mockReturnValue(mockSupabase);
        createServerSupabaseClient.mockResolvedValue(mockSupabase);
    });

    it('returns 401 when user is unauthenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

        const request = new Request('http://localhost:3000/api/merchant/subscription/pay-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planCode: 'MSUB_1M' })
        });

        const res = await POST(request);
        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.error).toBe('UNAUTHORIZED');
    });

    it('returns 404 when merchant profile is not found', async () => {
        mockMaybeSingle.mockResolvedValue({ data: null, error: null });

        const request = new Request('http://localhost:3000/api/merchant/subscription/pay-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planCode: 'MSUB_1M' })
        });

        const res = await POST(request);
        const data = await res.json();

        expect(res.status).toBe(404);
        expect(data.error).toBe('MERCHANT_NOT_FOUND');
    });

    it('returns 400 when invalid plan code is specified', async () => {
        mockMaybeSingle.mockResolvedValue({
            data: { id: 'm-123', user_id: 'user-merchant-123', business_name: 'Store' },
            error: null
        });

        const request = new Request('http://localhost:3000/api/merchant/subscription/pay-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planCode: 'INVALID_CODE' })
        });

        const res = await POST(request);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('INVALID_PLAN');
    });

    it('returns 400 with shortfall details when wallet balance is insufficient', async () => {
        mockMaybeSingle.mockResolvedValue({
            data: { id: 'm-123', user_id: 'user-merchant-123', business_name: 'Store' },
            error: null
        });

        mockRpc.mockResolvedValue({
            data: {
                success: false,
                error: 'INSUFFICIENT_WALLET_BALANCE',
                requiredPaise: 399900,
                availablePaise: 210000,
                shortfallPaise: 189900,
                message: 'Insufficient wallet balance. Required: ₹3999.00, Available: ₹2100.00'
            },
            error: null
        });

        const request = new Request('http://localhost:3000/api/merchant/subscription/pay-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planCode: 'MSUB_12M' })
        });

        const res = await POST(request);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('INSUFFICIENT_WALLET_BALANCE');
        expect(data.shortfallPaise).toBe(189900);
        expect(notifyMerchantSubscriptionStatus).not.toHaveBeenCalled();
    });

    it('successfully processes wallet subscription and dispatches WhatsApp notification', async () => {
        mockMaybeSingle.mockResolvedValue({
            data: { id: 'm-123', user_id: 'user-merchant-123', business_name: 'Store' },
            error: null
        });

        const expectedExpiry = '2027-09-11T12:00:00.000Z';
        mockRpc.mockResolvedValue({
            data: {
                success: true,
                replayed: false,
                paymentMethod: 'WALLET',
                planCode: 'MSUB_12M',
                amountPaidPaise: 399900,
                subscriptionExpiresAt: expectedExpiry,
                walletBalancePaise: 500000,
                transactionReference: 'WALLET-MSUB-12345',
                isRenewal: true,
                message: 'Subscription renewed successfully.'
            },
            error: null
        });

        const request = new Request('http://localhost:3000/api/merchant/subscription/pay-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planCode: 'MSUB_12M',
                idempotencyKey: 'WALLET-MSUB-12345'
            })
        });

        const res = await POST(request);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.paymentMethod).toBe('WALLET');
        expect(data.amountPaidPaise).toBe(399900);
        expect(mockRpc).toHaveBeenCalledWith('pay_merchant_subscription_with_wallet', {
            p_merchant_id: 'm-123',
            p_plan_code: 'MSUB_12M',
            p_idempotency_key: 'WALLET-MSUB-12345'
        });
        expect(notifyMerchantSubscriptionStatus).toHaveBeenCalledTimes(1);
    });

    it('returns replayed response without re-triggering WhatsApp notification', async () => {
        mockMaybeSingle.mockResolvedValue({
            data: { id: 'm-123', user_id: 'user-merchant-123', business_name: 'Store' },
            error: null
        });

        mockRpc.mockResolvedValue({
            data: {
                success: true,
                replayed: true,
                paymentMethod: 'WALLET',
                planCode: 'MSUB_1M',
                amountPaidPaise: 49900,
                subscriptionExpiresAt: '2026-10-11T12:00:00.000Z',
                walletBalancePaise: 100000,
                transactionReference: 'WALLET-MSUB-EXISTING',
                message: 'Subscription already processed.'
            },
            error: null
        });

        const request = new Request('http://localhost:3000/api/merchant/subscription/pay-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                planCode: 'MSUB_1M',
                idempotencyKey: 'WALLET-MSUB-EXISTING'
            })
        });

        const res = await POST(request);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.replayed).toBe(true);
        expect(notifyMerchantSubscriptionStatus).not.toHaveBeenCalled();
    });

    it('returns 500 when RPC returns an error', async () => {
        mockMaybeSingle.mockResolvedValue({
            data: { id: 'm-123', user_id: 'user-merchant-123', business_name: 'Store' },
            error: null
        });

        mockRpc.mockResolvedValue({
            data: null,
            error: { message: 'Database connection timeout' }
        });

        const request = new Request('http://localhost:3000/api/merchant/subscription/pay-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planCode: 'MSUB_1M' })
        });

        const res = await POST(request);
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe('SUBSCRIPTION_ERROR');
    });
});
