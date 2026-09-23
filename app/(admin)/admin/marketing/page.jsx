import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminMarketingClient from './AdminMarketingClient';

export const metadata = {
    title: 'Marketing Control Center | Admin | InTrust India',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminMarketingPage() {
    const authSupabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) redirect('/login');

    const adminSupabase = createAdminClient();

    const { data: profile } = await adminSupabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        redirect('/');
    }

    const supabase = adminSupabase;

    // 1. Fetch Dynamic Settings
    const { data: settingsRow } = await supabase
        .from('marketing_settings')
        .select('value')
        .eq('key', 'rewards_config')
        .maybeSingle();

    const rewardsConfig = settingsRow?.value || {
        daily_challenge_reward_paise: 2500,
        campaign_share_bonus_paise: 5000,
        product_promo_default_cashback_paise: 10000,
        sponsorship_fee_paise: 99900,
        questions_per_challenge: 10
    };

    // 1b. Fetch Dynamic Streak Configuration
    const { data: streakRow } = await supabase
        .from('marketing_settings')
        .select('value')
        .eq('key', 'streak_config')
        .maybeSingle();

    const streakConfig = streakRow?.value || {
        monthly_freezes_allowed: 1,
        milestones: [
            { days: 3, bonus_paise: 1000, badge: '3-Day Flame', active: true },
            { days: 7, bonus_paise: 3000, badge: 'Weekly Master', active: true },
            { days: 14, bonus_paise: 7500, badge: 'Bi-Weekly Champion', active: true },
            { days: 30, bonus_paise: 20000, badge: 'InTrust Legend', active: true }
        ]
    };

    // 2. Fetch Categories
    const { data: categories } = await supabase
        .from('daily_challenge_categories')
        .select('*')
        .order('sort_order', { ascending: true });

    // 3. Fetch Questions (Up to 250 with full category details)
    const { data: questions } = await supabase
        .from('daily_challenge_questions')
        .select('*, daily_challenge_categories(id, title, slug)')
        .order('created_at', { ascending: false })
        .limit(250);

    // 4. Fetch Sponsorship Bookings with full Merchant info
    const { data: sponsorships } = await supabase
        .from('daily_challenge_sponsorships')
        .select('*, merchants(id, business_name, business_phone, business_email, store_name, city, state)')
        .order('sponsor_date', { ascending: false })
        .limit(60);

    // 4b. Fetch Verified Merchants List for Manual Admin Sponsorship Assignment & Control
    const { data: merchantsList } = await supabase
        .from('merchants')
        .select('id, user_id, business_name, store_name, business_phone, business_email, status, city')
        .order('business_name', { ascending: true })
        .limit(250);

    // 4c. Fetch Users List for Admin Targeting, Gift Awards & Attribution
    const { data: usersList } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email, role, avatar_url')
        .order('created_at', { ascending: false })
        .limit(250);

    // 5. Fetch Targets
    const { data: targets } = await supabase
        .from('marketing_targets')
        .select('*')
        .order('sort_order', { ascending: true });

    // 6. Fetch Gift Claims
    const { data: claims } = await supabase
        .from('marketing_target_claims')
        .select('*, marketing_targets(id, title, gift_name, reward_type, reward_value_paise)')
        .order('claimed_at', { ascending: false })
        .limit(100);

    // 7. Fetch Recent Attribution Tracking Logs
    const { data: trackingLogs } = await supabase
        .from('marketing_tracking_events')
        .select('*, marketing_share_links(id, code, source, user_id, user_type)')
        .order('created_at', { ascending: false })
        .limit(60);

    // 8. Fetch InTrust Official Products (Strictly submitted_by_merchant_id IS NULL)
    const { data: rawOfficialProducts } = await supabase
        .from('shopping_products')
        .select('id, title, slug, product_images, suggested_retail_price_paise, wholesale_price_paise, category, sub_category, is_active')
        .is('submitted_by_merchant_id', null)
        .eq('is_active', true)
        .order('title', { ascending: true })
        .limit(1000);

    // 8b. Fetch Saved Official Products Selection
    const { data: officialProductsSetting } = await supabase
        .from('marketing_settings')
        .select('value')
        .eq('key', 'official_marketing_products')
        .maybeSingle();

    const selectedOfficialProductIds = officialProductsSetting?.value?.product_ids || [];
    const officialSharingAudience = officialProductsSetting?.value?.allowed_audience || 'all';
    const initialAllowedUserIds = officialProductsSetting?.value?.allowed_user_ids || [];
    const initialAllowedMerchantIds = officialProductsSetting?.value?.allowed_merchant_ids || [];

    // 9. Fetch Aggregate Performance Stats for Executive Overview
    const { data: shareLinks, count: totalLinksCount } = await supabase
        .from('marketing_share_links')
        .select('clicks_count, shares_count, orders_count, total_earnings_paise', { count: 'exact' });

    const { count: totalPlaysCount } = await supabase
        .from('daily_challenge_plays')
        .select('id', { count: 'exact', head: true });

    let totalClicks = 0;
    let totalShares = 0;
    let totalOrders = 0;
    let totalEarningsPaise = 0;

    (shareLinks || []).forEach(l => {
        totalClicks += (l.clicks_count || 0);
        totalShares += (l.shares_count || 0);
        totalOrders += (l.orders_count || 0);
        totalEarningsPaise += (l.total_earnings_paise || 0);
    });

    const totalSponsorshipRevenuePaise = (sponsorships || []).reduce(
        (sum, s) => sum + (s.payment_status === 'paid' ? (s.fee_paise || 0) : 0),
        0
    );

    const overviewStats = {
        totalLinks: totalLinksCount || 0,
        totalClicks,
        totalShares,
        totalOrders,
        totalEarningsPaise,
        totalPlays: totalPlaysCount || 0,
        totalSponsorshipRevenuePaise,
        totalCategories: categories?.length || 0,
        totalQuestions: questions?.length || 0,
        pendingClaimsCount: claims?.filter(c => c.status === 'earned' || c.status === 'processing').length || 0,
        deliveredClaimsCount: claims?.filter(c => c.status === 'delivered').length || 0
    };

    return (
        <AdminMarketingClient
            initialRewardsConfig={rewardsConfig}
            initialStreakConfig={streakConfig}
            initialCategories={categories || []}
            initialQuestions={questions || []}
            initialSponsorships={sponsorships || []}
            initialTargets={targets || []}
            initialClaims={claims || []}
            initialTrackingLogs={trackingLogs || []}
            initialMerchants={merchantsList || []}
            initialUsers={usersList || []}
            overviewStats={overviewStats}
            officialProducts={rawOfficialProducts || []}
            initialSelectedOfficialProductIds={selectedOfficialProductIds}
            initialOfficialAudience={officialSharingAudience}
            initialAllowedUserIds={initialAllowedUserIds}
            initialAllowedMerchantIds={initialAllowedMerchantIds}
        />
    );
}
