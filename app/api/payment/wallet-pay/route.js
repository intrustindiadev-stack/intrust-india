import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CustomerWalletService } from '@/lib/wallet/customerWalletService';
import { notifyMerchantSubscriptionStatus } from '@/lib/notifications/merchantWhatsapp';
import { GOLD_SUBSCRIPTION_PLANS } from '@/lib/constants';

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        // `amount` is intentionally ignored — price is derived server-side from the plan.
        const { packageId } = body;

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

        // 2. Idempotency header
        const idempotencyKey = request.headers.get('Idempotency-Key') || null;

        // 3. Look up canonical plan — reject unknown packageId
        const plan = GOLD_SUBSCRIPTION_PLANS.find(p => p.key === packageId);
        if (!plan) {
            return NextResponse.json({ error: 'Invalid package selection.' }, { status: 400 });
        }

        const { price: priceRupees, durationMonths: monthsToAdd, cashback: cashbackAmount } = plan;

        // 4. Admin client for privileged operations
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 5. Idempotency check — return early if this key was already processed
        if (idempotencyKey) {
            const { data: existingDebit } = await supabaseAdmin
                .from('customer_wallet_transactions')
                .select('id')
                .eq('reference_id', idempotencyKey)
                .eq('reference_type', 'GOLD_SUBSCRIPTION')
                .eq('transaction_type', 'DEBIT')
                .maybeSingle();

            if (existingDebit) {
                console.log(`[WalletPay] Idempotent replay for key ${idempotencyKey}`);
                return NextResponse.json({ success: true, replayed: true });
            }
        }

        // 6. Determine new subscription expiry (extend if currently active)
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

        // 7. Deduct from Wallet (canonical server-side price)
        const description = `Elite Gold ${plan.label} Subscription Activation`;
        const referenceId = idempotencyKey || packageId;
        try {
            await CustomerWalletService.debitWallet(
                user.id,
                priceRupees,
                description,
                { id: referenceId, type: 'GOLD_SUBSCRIPTION' }
            );
        } catch (walletErr) {
            return NextResponse.json({ error: walletErr.message }, { status: 400 });
        }

        // 8. Update User Profile
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

        // 9. Credit Cashback Reward
        try {
            await CustomerWalletService.creditWallet(
                user.id,
                cashbackAmount,
                'CASHBACK',
                `Gold ${plan.label} Subscription Cashback Reward (Wallet Pay)`,
                { id: referenceId, type: 'SUBSCRIPTION', method: 'WALLET' }
            );
        } catch (cashbackErr) {
            // Non-fatal — primary action (subscription) already succeeded
            console.error('[WalletPay] Cashback Error:', cashbackErr);
        }

        // 10. Notify User
        await supabaseAdmin.from('notifications').insert([{
            user_id: user.id,
            title: 'Elite Gold Activated! 🎉',
            body: `Your Elite Gold subscription has been activated using your wallet. Expiry: ${newExpiryDate.toLocaleDateString('en-IN')}`,
            type: 'success',
            reference_type: 'merchant_subscription',
            reference_id: packageId
        }]);

        // 11. WhatsApp Notification (fire-and-forget)
        Promise.resolve().then(() => {
            notifyMerchantSubscriptionStatus({
                merchantUserId: user.id,
                status: 'Active ✅',
                expiry: newExpiryDate.toLocaleDateString('en-IN')
            }).catch(err => {
                console.error('[WalletPay] WhatsApp notification error:', err);
            });
        });

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
