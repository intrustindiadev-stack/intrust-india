'use server';

import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

export async function getMerchantReferralData(merchantId) {
    if (!merchantId) {
        throw new Error('Merchant ID is required');
    }

    const adminSupabase = createAdminClient();

    try {
        const [
            { data: merchantData, error: merchantError },
            { data: networkData, error: networkError },
            { data: prizeData, error: prizeError },
            { data: depthData, error: depthError },
            { data: settingData, error: settingError }
        ] = await Promise.all([
            adminSupabase
                .from('merchants')
                .select('referral_code, referred_by_merchant_id')
                .eq('id', merchantId)
                .single(),
            adminSupabase
                .from('merchant_tree_paths')
                .select(`
                    descendant_id,
                    merchants:descendant_id (
                        business_name,
                        status,
                        subscription_status,
                        created_at
                    )
                `)
                .eq('ancestor_id', merchantId)
                .eq('level', 1),
            adminSupabase
                .from('merchant_transactions')
                .select('id, amount_paise, created_at, description')
                .eq('merchant_id', merchantId)
                .eq('transaction_type', 'referral_reward')
                .order('created_at', { ascending: false }),
            adminSupabase
                .from('merchant_tree_paths')
                .select('level')
                .eq('ancestor_id', merchantId)
                .order('level', { ascending: false })
                .limit(1),
            adminSupabase
                .from('platform_settings')
                .select('value')
                .eq('key', 'merchant_referral_prize_paise')
                .single()
        ]);

        if (merchantError) {
            console.error('Error fetching merchant referral code:', merchantError);
        }
        if (networkError) {
            console.error('Error fetching merchant network:', networkError);
        }
        if (prizeError) {
            console.error('Error fetching merchant referral prizes:', prizeError);
        }
        if (depthError) {
            console.error('Error fetching merchant network depth:', depthError);
        }
        if (settingError) {
            console.warn('Error fetching merchant_referral_prize_paise:', settingError);
        }

        const directReferrals = networkData?.map(item => item.merchants) || [];
        const chainDepth = depthData && depthData.length > 0 ? depthData[0].level : 0;
        const referralPrizePaise = Number(settingData?.value || 50000);
        const referralPrizeRupees = Math.round(referralPrizePaise / 100);

        return {
            referralCode: merchantData?.referral_code || null,
            hasReferrer: !!merchantData?.referred_by_merchant_id,
            directReferrals,
            prizeHistory: prizeData || [],
            chainDepth,
            referralPrizeRupees
        };

    } catch (err) {
        console.error('getMerchantReferralData exception:', err);
        throw new Error('Failed to fetch referral data');
    }
}
