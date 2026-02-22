import { createClient } from '@supabase/supabase-js';
import { CustomerWalletService } from '../../../lib/wallet/customerWalletService';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { packageId, amount } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !packageId || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                global: { headers: { Authorization: authHeader } }
            }
        );

        // 1. Verify user session
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Unauthorized');

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 2. Fetch current wallet balance to double check
        const { data: wallet } = await supabaseAdmin
            .from('customer_wallets')
            .select('balance_paise')
            .eq('user_id', user.id)
            .single();

        const balanceRupee = (wallet?.balance_paise || 0) / 100;

        if (balanceRupee < amount) {
            return res.status(400).json({ error: 'Insufficient wallet balance' });
        }

        // 3. Deduct Wallet Balance
        const debitResult = await CustomerWalletService.debitWallet(
            user.id,
            amount,
            'SUBSCRIPTION_PURCHASE',
            `Purchase of ${packageId} Membership`,
            { packageId, method: 'WALLET' }
        );

        if (!debitResult.success) {
            throw new Error(debitResult.error || 'Failed to deduct wallet balance');
        }

        // 4. Update Profile (Grant Gold Status)
        // A. Determine Package Details
        let monthsToAdd = 12;
        let cashbackAmount = 1499.00;

        if (packageId === 'GOLD_1M') {
            monthsToAdd = 1;
            cashbackAmount = 199.00;
        } else if (packageId === 'GOLD_3M') {
            monthsToAdd = 3;
            cashbackAmount = 499.00;
        } else if (packageId === 'GOLD_1Y') {
            monthsToAdd = 12;
            cashbackAmount = 1499.00;
        }

        // B. Calculate New Expiry
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

        // C. Update Profile
        await supabaseAdmin
            .from('user_profiles')
            .update({
                is_gold_verified: true,
                subscription_expiry: newExpiryDate.toISOString(),
                updated_at: new Date()
            })
            .eq('id', user.id);

        // 5. Credit Cashback Reward
        await CustomerWalletService.creditWallet(
            user.id,
            cashbackAmount,
            'CASHBACK',
            `Gold ${monthsToAdd}M Subscription Cashback Reward (Wallet Purchase)`,
            { type: 'SUBSCRIPTION', package: packageId, paymentMethod: 'WALLET' }
        );

        return res.status(200).json({ success: true, message: 'Subscription activated' });

    } catch (error) {
        console.error('Wallet Pay API Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
