import { createServerSupabaseClient } from '@/lib/supabaseServer';
import MarketingOverviewClient from './MarketingOverviewClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Fetch marketing stats + streak in parallel (multi-user fast path)
    const statsDefault = {
        total_shares: 0,
        link_clicks: 0,
        new_customers: 0,
        orders: 0,
        cashback_earned_paise: 0,
        rewards_config: {
            daily_challenge_reward_paise: 2500,
            campaign_share_bonus_paise: 5000,
            product_promo_default_cashback_paise: 10000,
            sponsorship_fee_paise: 99900
        }
    };
    let stats = { ...statsDefault };
    let streakData = { current_streak: 0, highest_streak: 0, played_today: false, freezes_left: 1 };

    try {
        const [rpcStatsRes, streakRes] = await Promise.allSettled([
            supabase.rpc('get_marketing_dashboard_stats', { p_user_id: user.id }),
            supabase.rpc('get_user_quiz_streak'),
        ]);
        if (rpcStatsRes.status === 'fulfilled' && !rpcStatsRes.value.error && rpcStatsRes.value.data) {
            const rpcStats = rpcStatsRes.value.data;
            stats = {
                ...stats,
                ...rpcStats,
                total_shares: Number(rpcStats.total_shares || 0),
                link_clicks: Number(rpcStats.link_clicks || 0),
                new_customers: Number(rpcStats.new_customers || 0),
                orders: Number(rpcStats.orders || 0),
                cashback_earned_paise: Number(rpcStats.cashback_earned_paise || 0),
                rewards_config: rpcStats.rewards_config || stats.rewards_config
            };
        }
        if (streakRes.status === 'fulfilled' && streakRes.value.data) {
            streakData = streakRes.value.data;
        }
    } catch (e) {
        console.error('Error fetching marketing stats:', e);
    }

    // Fetch active primary target & user's current progress
    let primaryTarget = null;
    try {
        const { data: targets } = await supabase
            .from('marketing_targets')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .limit(1);

        if (targets && targets.length > 0) {
            const target = targets[0];
            let currentVal = 0;
            if (target.metric_type === 'share_links') {
                currentVal = stats.total_shares || 0;
            } else if (target.metric_type === 'link_clicks') {
                currentVal = stats.link_clicks || 0;
            } else if (target.metric_type === 'quiz_streak') {
                currentVal = streakData.current_streak || 0;
            } else if (target.metric_type === 'store_sales') {
                currentVal = stats.orders || 0;
            } else if (target.metric_type === 'user_registration') {
                currentVal = 1;
            } else if (target.metric_type === 'daily_login') {
                currentVal = Math.max(streakData.current_streak || 0, 1);
            } else if (target.metric_type === 'first_order') {
                currentVal = (stats.orders || 0) >= 1 ? 1 : 0;
            } else {
                currentVal = stats.orders || stats.total_shares || 0;
            }
            primaryTarget = {
                ...target,
                current_value: currentVal,
                percent: Math.min(100, Math.round((currentVal / (target.target_value || 1)) * 100))
            };
        }
    } catch (e) {
        console.error('Error fetching primary target:', e);
    }

    // Fetch recent marketing transactions
    const txPromise = isMerchant && merchant?.id
        ? supabase
            .from('merchant_transactions')
            .select('id, amount_paise, transaction_type, description, created_at')
            .eq('merchant_id', merchant.id)
            .in('transaction_type', ['daily_challenge_cashback', 'marketing_cashback', 'referral_reward', 'sponsorship'])
            .order('created_at', { ascending: false })
            .limit(5)
        : supabase
            .from('customer_wallet_transactions')
            .select('id, amount_paise, type, description, created_at')
            .eq('user_id', user.id)
            .or('reference_type.in.(DAILY_CHALLENGE,MARKETING_REFERRAL),description.ilike.%Challenge%,description.ilike.%Referral%,description.ilike.%Marketing%')
            .order('created_at', { ascending: false })
            .limit(5);

    // Fetch active showcase prizes (real gift_name/image for the prizes strip)
    const showcasePrizesPromise = supabase
        .from('marketing_targets')
        .select('id, title, gift_name, gift_image_url, reward_type, reward_value_paise, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3);

    // Fetch user's top shared links with actual product info
    const linksPromise = supabase
        .from('marketing_share_links')
        .select(`
            id, code, clicks_count, shares_count, orders_count, product_id,
            shopping_products:shopping_products!marketing_share_links_product_id_fkey(id, title, price, image_url, promo_cashback_paise, slug)
        `)
        .eq('user_id', user.id)
        .order('clicks_count', { ascending: false })
        .limit(3);

    const [txRes, prizesRes, linksRes] = await Promise.allSettled([txPromise, showcasePrizesPromise, linksPromise]);

    let recentTransactions = [];
    if (txRes.status === 'fulfilled' && txRes.value.data) {
        const txs = txRes.value.data;
        recentTransactions = isMerchant
            ? (txs || []).map(t => ({ ...t, type: t.transaction_type === 'sponsorship' ? 'DEBIT' : 'CREDIT' }))
            : (txs || []);
    }
    const showcasePrizes = prizesRes.status === 'fulfilled' ? (prizesRes.value.data || []) : [];

    let topProducts = [];
    try {
        const links = linksRes.status === 'fulfilled' ? linksRes.value.data : null;

        if (links && links.length > 0) {
            topProducts = links
                .filter(l => l.shopping_products)
                .map(l => ({
                    id: l.shopping_products.id,
                    title: l.shopping_products.title,
                    price: l.shopping_products.price,
                    image: l.shopping_products.image_url || '/icons/intrustLogo.png',
                    clicks: l.clicks_count || 0,
                    orders: l.orders_count || 0,
                    code: l.code,
                    promo_cashback_paise: l.shopping_products.promo_cashback_paise || 10000
                }));
        }
    } catch (e) {
        console.error('Error fetching user top shared products:', e);
    }

    // If user has no shared links yet, fetch featured platform products for them to share
    if (topProducts.length === 0) {
        const { data: featuredProds } = await supabase
            .from('shopping_products')
            .select('id, title, price, image_url, promo_cashback_paise, slug')
            .eq('is_active', true)
            .limit(3);

        topProducts = (featuredProds || []).map(p => ({
            id: p.id,
            title: p.title,
            price: p.price,
            image: p.image_url || '/icons/intrustLogo.png',
            clicks: 0,
            orders: 0,
            isNew: true,
            promo_cashback_paise: p.promo_cashback_paise || 10000
        }));
    }

    return (
        <MarketingOverviewClient
            user={user}
            profile={profile}
            merchant={merchant}
            isMerchant={isMerchant}
            initialStats={stats}
            initialStreak={streakData}
            initialPrimaryTarget={primaryTarget}
            initialTransactions={recentTransactions}
            initialTopProducts={topProducts}
            showcasePrizes={showcasePrizes}
        />
    );
}
