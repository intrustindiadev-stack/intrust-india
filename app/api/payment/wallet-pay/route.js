import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CustomerWalletService } from '@/lib/wallet/customerWalletService';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { packageId, amount } = body;

        // 1. Get User Session
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                global: { headers: { Authorization: `Bearer ${token}` } }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!packageId || !amount) {
            return NextResponse.json({ error: 'Missing package details' }, { status: 400 });
        }

        // 2. Process Subscription Logic
        const monthsToAdd = packageId === 'GOLD_1M' ? 1 : packageId === 'GOLD_3M' ? 3 : 12;

        // 3. Create Admin Client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 4. Verification Check
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('is_gold_verified, subscription_expiry')
            .eq('id', user.id)
            .single();

        let baseDate = new Date();
        if (profile?.is_gold_verified && profile?.subscription_expiry) {
            const currentExpiry = new Date(profile.subscription_expiry);
            if (currentExpiry > baseDate) {
                baseDate = currentExpiry;
            }
        }

        const newExpiryDate = new Date(baseDate);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

        // 5. Deduct from Wallet
        const description = `Elite Gold ${packageId.replace('GOLD_', '')} Subscription Activation`;
        try {
            await CustomerWalletService.debitWallet(
                user.id,
                amount,
                description,
                { id: packageId, type: 'GOLD_SUBSCRIPTION' }
            );
        } catch (walletErr) {
            return NextResponse.json({ error: walletErr.message }, { status: 400 });
        }

        // 6. Update User Profile
        const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update({
                is_gold_verified: true,
                subscription_expiry: newExpiryDate.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('[WalletPay] Profile Update Error:', updateError);
            return NextResponse.json({ error: 'Failed to update subscription status' }, { status: 500 });
        }

        // 7. Add Cashback Reward (Matching gateway behavior)
        let cashbackAmount = 1499.00;
        if (packageId === 'GOLD_1M') cashbackAmount = 199.00;
        else if (packageId === 'GOLD_3M') cashbackAmount = 499.00;

        try {
            await CustomerWalletService.creditWallet(
                user.id,
                cashbackAmount,
                'CASHBACK',
                `Gold ${monthsToAdd}M Subscription Cashback Reward (Wallet Pay)`,
                { id: packageId, type: 'SUBSCRIPTION', method: 'WALLET' }
            );
        } catch (cashbackErr) {
            console.error('[WalletPay] Cashback Error:', cashbackErr);
            // We don't fail the whole request because the primary action (subscription) succeeded
        }

        return NextResponse.json({
            success: true,
            message: 'Subscription activated and cashback rewarded',
            newExpiry: newExpiryDate.toISOString()
        });

    } catch (error) {
        console.error('[WalletPay] Fatal Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
