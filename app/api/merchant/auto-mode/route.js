import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { getPricingSettings } from '@/app/(admin)/admin/settings/actions';
import { requireMerchantSubscription } from '@/lib/merchant/requireSubscription';

export async function GET(request) {
    try {
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createAdminClient();

        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, business_name, auto_mode, auto_mode_status, auto_mode_months_paid, auto_mode_valid_until, subscription_status, subscription_expires_at, wallet_balance_paise')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
        }

        const now = new Date();
        const hasValidSub = Boolean(merchant.auto_mode_valid_until && new Date(merchant.auto_mode_valid_until) > now);
        const isActive = Boolean(merchant.auto_mode === true && hasValidSub);

        const pricing = await getPricingSettings();
        const isFirstMonth = (merchant.auto_mode_months_paid || 0) === 0;
        const subscriptionPrice = isFirstMonth ? pricing.autoFirst : pricing.autoRenewal;

        return NextResponse.json({
            merchant_id: merchant.id,
            business_name: merchant.business_name,
            auto_mode: merchant.auto_mode,
            auto_mode_status: merchant.auto_mode_status,
            is_active: isActive,
            has_valid_sub: hasValidSub,
            valid_until: merchant.auto_mode_valid_until,
            months_paid: merchant.auto_mode_months_paid || 0,
            wallet_balance_paise: merchant.wallet_balance_paise || 0,
            pricing: {
                autoFirst: pricing.autoFirst,
                autoRenewal: pricing.autoRenewal,
                currentPrice: subscriptionPrice,
                isFirstMonth
            }
        });
    } catch (error) {
        console.error('[API] Auto Mode GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use admin client for database writes safely
        const supabase = createAdminClient();

        const reqData = await request.json();
        const { action } = reqData; // 'activate' or 'deactivate'

        // Subscription guard: only activate requires subscription
        if (action === 'activate') {
            const subResult = await requireMerchantSubscription(request);
            if (!subResult.ok) return subResult.response;
        }

        // 1. Get current merchant data
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, auto_mode, subscription_status, subscription_expires_at, auto_mode_months_paid, auto_mode_valid_until')
            .eq('user_id', user.id)
            .single();

        if (merchantError || !merchant) {
            return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
        }

        if (action === 'deactivate') {
            const { error: updateError } = await supabase
                .from('merchants')
                .update({
                    auto_mode: false,
                    auto_mode_status: 'inactive'
                })
                .eq('id', merchant.id);

            if (updateError) throw updateError;
            return NextResponse.json({
                success: true,
                message: 'Auto Mode deactivated',
                is_active: false
            });
        }

        if (action === 'activate') {
            const now = new Date();
            const hasValidSub = Boolean(merchant.auto_mode_valid_until && new Date(merchant.auto_mode_valid_until) > now);

            // If auto_mode is already true AND subscription is still valid, reject duplicate activation
            if (merchant.auto_mode === true && hasValidSub) {
                return NextResponse.json({ error: 'Auto Mode is already active' }, { status: 400 });
            }

            if (hasValidSub) {
                // Subscription is still active, just turn the switch back on without charging
                const { error: updateError } = await supabase
                    .from('merchants')
                    .update({
                        auto_mode: true,
                        auto_mode_status: 'active'
                    })
                    .eq('id', merchant.id);

                if (updateError) throw updateError;

                return NextResponse.json({
                    success: true,
                    message: 'Auto Mode re-activated successfully (Existing Subscription)',
                    is_active: true,
                    valid_until: merchant.auto_mode_valid_until
                });
            } else {
                // Charge the merchant via Atomic RPC
                const pricing = await getPricingSettings();
                const costRupees = (merchant.auto_mode_months_paid || 0) === 0 ? pricing.autoFirst : pricing.autoRenewal;
                const costPaise = costRupees * 100;

                const { data, error: rpcError } = await supabase.rpc('merchant_activate_auto_mode', {
                    p_merchant_id: merchant.id,
                    p_price_paise: costPaise,
                    p_description: `Auto Mode Subscription (${costRupees} INR)`
                });

                if (rpcError) throw rpcError;

                if (!data?.success) {
                    return NextResponse.json({ error: data?.message || 'Activation failed' }, { status: 400 });
                }

                return NextResponse.json({
                    success: true,
                    message: data.message,
                    new_balance: data.new_balance,
                    valid_until: data.valid_until,
                    is_active: true
                });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[API] Auto Mode Toggle Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

