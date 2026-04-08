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
            .select('id, auto_mode_status, auto_mode_months_paid, wallet_balance_paise')
            .eq('user_id', user.id)
            .single();

        if (merchantError) {
            return NextResponse.json({ error: 'Merchant account not found.' }, { status: 404 });
        }

        if (action === 'deactivate') {
            const { error: updateError } = await supabase
                .from('merchants')
                .update({ auto_mode_status: 'inactive' })
                .eq('id', merchant.id);

            if (updateError) throw updateError;
            return NextResponse.json({ success: true, message: 'Auto Mode deactivated' });
        }

        if (action === 'activate') {
            if (merchant.auto_mode_status === 'active') {
                return NextResponse.json({ error: 'Auto Mode is already active' }, { status: 400 });
            }

            // Check if subscription was turned off but hasn't expired yet
            const isCurrentlyValid = merchant.auto_mode_valid_until && new Date(merchant.auto_mode_valid_until) > new Date();

            if (isCurrentlyValid) {
                const { error: updateError } = await supabase
                    .from('merchants')
                    .update({ auto_mode_status: 'active' })
                    .eq('id', merchant.id);

                if (updateError) throw updateError;

                return NextResponse.json({ 
                    success: true, 
                    message: 'Auto Mode reactivated successfully (Current billing cycle reused)',
                    newBalance: merchant.wallet_balance_paise / 100, // wallet doesn't change
                    validUntil: merchant.auto_mode_valid_until,
                    months_paid: merchant.auto_mode_months_paid
                });
            }

            const isFirstMonth = (merchant.auto_mode_months_paid || 0) === 0;
            const subscriptionPrice = isFirstMonth ? 999 : 1999;
            const pricePaise = subscriptionPrice * 100;

            // Call atomic RPC for balance check, deduction, status update, and transaction logging
            const { data: rpcData, error: rpcError } = await supabase.rpc('merchant_activate_auto_mode', {
                p_merchant_id: merchant.id,
                p_price_paise: pricePaise,
                p_description: `Auto Mode Subscription (${isFirstMonth ? '1st Month' : 'Renewal'})`,
                p_metadata: { reference_id: `AUTO_${Date.now()}` }
            });

            if (rpcError) {
                console.error('RPC Error:', rpcError);
                return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 });
            }

            if (!rpcData.success) {
                return NextResponse.json({ error: rpcData.message }, { status: 400 });
            }

            return NextResponse.json({ 
                success: true, 
                message: rpcData.message,
                newBalance: rpcData.new_balance / 100,
                validUntil: rpcData.valid_until,
                months_paid: rpcData.months_paid
            });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('[API] Auto Mode Toggle Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
