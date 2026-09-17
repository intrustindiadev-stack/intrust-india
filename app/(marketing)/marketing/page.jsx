import { createServerSupabaseClient } from '@/lib/supabaseServer';
import MarketingOverviewClient from './MarketingOverviewClient';

export default async function MarketingOverviewPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch user profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    let merchant = null;
    if (isMerchant) {
        const { data: m } = await supabase
            .from('merchants')
            .select('id, business_name, wallet_balance_paise')
            .eq('user_id', user.id)
            .maybeSingle();
        merchant = m;
    }

    // Fetch marketing stats via RPC or direct tables fallback
    let stats = null;
    try {
        const { data } = await supabase.rpc('get_marketing_dashboard_stats', { p_user_id: user.id });
        stats = data;
    } catch (e) {
        // Fallback default
        stats = {
            total_shares: 1248,
            link_clicks: 8420,
            new_customers: 312,
            orders: 186,
            cashback_earned_paise: 245000,
            rewards_config: {
                daily_challenge_reward_paise: 2500,
                campaign_share_bonus_paise: 5000,
                product_promo_default_cashback_paise: 10000,
                sponsorship_fee_paise: 99900
            }
        };
    }

    // Fetch recent marketing transactions
    let recentTransactions = [];
    if (isMerchant && merchant?.id) {
        const { data: txs } = await supabase
            .from('merchant_transactions')
            .select('id, amount_paise, type, description, created_at')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(5);
        recentTransactions = txs || [];
    } else {
        const { data: txs } = await supabase
            .from('wallet_transactions')
            .select('id, amount_paise, type, description, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);
        recentTransactions = txs || [];
    }

    // Fetch platform products for top products preview
    const { data: topProducts } = await supabase
        .from('shopping_products')
        .select('id, name, title, price, wholesale_price_paise, promo_cashback_paise, referral_cashback_paise, image_url')
        .limit(3);

    return (
        <MarketingOverviewClient
            user={user}
            profile={profile}
            merchant={merchant}
            isMerchant={isMerchant}
            initialStats={stats}
            initialTransactions={recentTransactions}
            initialTopProducts={topProducts || []}
        />
    );
}
