import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyMerchantSubscriptionStatus } from '@/lib/notifications/merchantWhatsapp';

export async function POST(request) {
    try {
        // 1. Authenticate user from Bearer token or cookie session
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        let user = null;

        if (token) {
            const admin = createAdminClient();
            const { data: { user: tokenUser }, error: tokenError } = await admin.auth.getUser(token);
            if (!tokenError) user = tokenUser;
        }

        if (!user) {
            const supabaseAuth = await createServerSupabaseClient();
            const { data: { user: cookieUser } } = await supabaseAuth.auth.getUser();
            user = cookieUser;
        }

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Authentication required. Please log in again.'
            }, { status: 401 });
        }

        // 2. Resolve merchant owned by the authenticated user
        const adminSupabase = createAdminClient();
        const { data: merchant, error: merchantError } = await adminSupabase
            .from('merchants')
            .select('id, user_id, business_name, status')
            .eq('user_id', user.id)
            .maybeSingle();

        if (merchantError || !merchant) {
            return NextResponse.json({
                success: false,
                error: 'MERCHANT_NOT_FOUND',
                message: 'Merchant profile not found for this account.'
            }, { status: 404 });
        }

        // 3. Parse and validate input payload
        let body = {};
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({
                success: false,
                error: 'INVALID_INPUT',
                message: 'Invalid JSON request body.'
            }, { status: 400 });
        }

        const { planCode, idempotencyKey } = body;

        const allowedPlans = ['MSUB_1M', 'MSUB_6M', 'MSUB_12M'];
        if (!planCode || !allowedPlans.includes(planCode)) {
            return NextResponse.json({
                success: false,
                error: 'INVALID_PLAN',
                message: `Invalid subscription plan. Allowed plans: ${allowedPlans.join(', ')}`
            }, { status: 400 });
        }

        // 4. Generate or sanitize client idempotency key
        const safeIdempotencyKey = (typeof idempotencyKey === 'string' && idempotencyKey.trim().length > 0)
            ? idempotencyKey.trim()
            : `WALLET-MSUB-${Date.now()}-${user.id.slice(0, 8)}`;

        // 5. Execute atomic server-side payment RPC
        const { data: result, error: rpcError } = await adminSupabase.rpc('pay_merchant_subscription_with_wallet', {
            p_merchant_id: merchant.id,
            p_plan_code: planCode,
            p_idempotency_key: safeIdempotencyKey
        });

        if (rpcError) {
            console.error('[API][pay-wallet] RPC failure:', rpcError);
            return NextResponse.json({
                success: false,
                error: 'SUBSCRIPTION_ERROR',
                message: 'Database error during wallet payment. No funds were deducted.'
            }, { status: 500 });
        }

        if (!result?.success) {
            const statusCode = result?.error === 'INSUFFICIENT_WALLET_BALANCE' ? 400 : 400;
            return NextResponse.json(result, { status: statusCode });
        }

        // 6. WhatsApp notification on successful execution (skip on duplicate replay)
        if (!result.replayed && result.subscriptionExpiresAt) {
            try {
                const expiryFormatted = new Date(result.subscriptionExpiresAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                await notifyMerchantSubscriptionStatus({
                    merchantUserId: user.id,
                    status: result.isRenewal ? 'renewed' : 'activated',
                    expiry: expiryFormatted
                });
            } catch (notifErr) {
                console.error('[API][pay-wallet] WhatsApp alert failed (non-fatal):', notifErr);
            }
        }

        return NextResponse.json(result, { status: 200 });

    } catch (err) {
        console.error('[API][pay-wallet] Unexpected failure:', err);
        return NextResponse.json({
            success: false,
            error: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred while processing wallet payment.'
        }, { status: 500 });
    }
}
