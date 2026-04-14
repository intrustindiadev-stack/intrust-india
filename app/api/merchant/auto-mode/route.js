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
                .update({ auto_mode: false })
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
                    .update({ auto_mode: true })
                    .eq('id', merchant.id);

                if (updateError) throw updateError;

                return NextResponse.json({ 
                    success: true, 
                    message: 'Auto Mode re-activated successfully (Existing Subscription)'
                });
            } else {
                // Charge the merchant
                const costRupees = (merchant.auto_mode_months_paid || 0) === 0 ? 999 : 1999;
                const costPaise = costRupees * 100;

                // Check wallet balance
                const { data: wallet, error: walletError } = await supabase
                    .from('merchant_wallets')
                    .select('id, balance_paise')
                    .eq('merchant_id', merchant.id)
                    .single();

                if (walletError || !wallet || wallet.balance_paise < costPaise) {
                    return NextResponse.json({ error: 'Insufficient wallet balance for Auto Mode subscription.' }, { status: 400 });
                }

                // Deduct from wallet
                const { error: deductError } = await supabase
                    .from('merchant_wallets')
                    .update({ balance_paise: wallet.balance_paise - costPaise })
                    .eq('id', wallet.id);
                
                if (deductError) throw deductError;

                // Log transaction
                await supabase.from('merchant_wallet_transactions').insert({
                    merchant_id: merchant.id,
                    type: 'platform_fee',
                    amount_paise: costPaise,
                    status: 'completed',
                    reference_id: `auto_mode_${Date.now()}`,
                    description: `Auto Mode Subscription (${costRupees} INR)`
                });

                const validUntil = new Date();
                validUntil.setMonth(validUntil.getMonth() + 1);

                const { error: updateError } = await supabase
                    .from('merchants')
                    .update({ 
                        auto_mode: true,
                        auto_mode_months_paid: (merchant.auto_mode_months_paid || 0) + 1,
                        auto_mode_valid_until: validUntil.toISOString()
                    })
                    .eq('id', merchant.id);

                if (updateError) throw updateError;

                return NextResponse.json({ 
                    success: true, 
                    message: 'Auto Mode activated successfully! Subscription purchased.'
                });
            }
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[API] Auto Mode Toggle Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
