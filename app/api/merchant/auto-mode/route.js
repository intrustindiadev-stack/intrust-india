import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

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

        // 1. Get current merchant data
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, auto_mode, subscription_status, subscription_expires_at, auto_mode_months_paid, auto_mode_valid_until')
            .eq('user_id', user.id)
            .single();

        if (merchantError) {
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
            return NextResponse.json({ success: true, message: 'Auto Mode deactivated' });
        }

        if (action === 'activate') {
            if (merchant.auto_mode === true) {
                return NextResponse.json({ error: 'Auto Mode is already active' }, { status: 400 });
            }

            const hasValidSub = merchant.auto_mode_valid_until && new Date(merchant.auto_mode_valid_until) > new Date();

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
                    message: 'Auto Mode re-activated successfully (Existing Subscription)'
                });
            } else {
                // Charge the merchant via Atomic RPC
                const costRupees = (merchant.auto_mode_months_paid || 0) === 0 ? 999 : 1999;
                const costPaise = costRupees * 100;

                const { data, error: rpcError } = await supabase.rpc('merchant_activate_auto_mode', {
                    p_merchant_id: merchant.id,
                    p_price_paise: costPaise,
                    p_description: `Auto Mode Subscription (${costRupees} INR)`
                });

                if (rpcError) throw rpcError;

                if (!data.success) {
                    return NextResponse.json({ error: data.message }, { status: 400 });
                }

                return NextResponse.json({
                    success: true,
                    message: data.message,
                    new_balance: data.new_balance,
                    valid_until: data.valid_until
                });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[API] Auto Mode Toggle Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
