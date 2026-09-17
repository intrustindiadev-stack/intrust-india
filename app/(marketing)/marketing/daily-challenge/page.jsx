import { createServerSupabaseClient } from '@/lib/supabaseServer';
import DailyChallengeClient from './DailyChallengeClient';

export default async function DailyChallengePage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check user profile & merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role, full_name')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    let merchant = null;
    let merchantInventory = [];

    if (isMerchant) {
        const { data: m } = await supabase
            .from('merchants')
            .select('id, business_name, wallet_balance_paise')
            .eq('user_id', user.id)
            .maybeSingle();
        merchant = m;

        if (merchant?.id) {
            const { data: inv } = await supabase
                .from('merchant_inventory')
                .select('id, product_name, price, image_url')
                .eq('merchant_id', merchant.id)
                .limit(20);
            merchantInventory = inv || [];
        }
    }

    // Fetch active categories
    const { data: categories } = await supabase
        .from('daily_challenge_categories')
        .select('id, slug, title, icon_name, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    // Fetch today's live or booked sponsor
    const todayDateStr = new Date().toISOString().split('T')[0];
    const { data: rawSponsor } = await supabase
        .from('daily_challenge_sponsorships')
        .select(`
            id, sponsor_date, campaign_message, product_ids, status,
            merchants (id, business_name, user_id)
        `)
        .eq('sponsor_date', todayDateStr)
        .in('status', ['live', 'booked'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let sponsorProducts = [];
    if (rawSponsor?.product_ids && Array.isArray(rawSponsor.product_ids) && rawSponsor.product_ids.length > 0) {
        const { data: invProds } = await supabase
            .from('merchant_inventory')
            .select('id, product_name, price, image_url')
            .in('id', rawSponsor.product_ids);
        sponsorProducts = invProds || [];
    }

    // If no sponsor products found or no sponsor, grab top platform partner products
    if (sponsorProducts.length === 0) {
        const { data: featuredProds } = await supabase
            .from('shopping_products')
            .select('id, title, price, image_url, discount_percent, slug')
            .eq('is_active', true)
            .limit(3);

        sponsorProducts = (featuredProds || []).map(p => ({
            id: p.id,
            product_name: p.title,
            price: p.price,
            image_url: p.image_url,
            discount_percent: p.discount_percent,
            slug: p.slug
        }));
    }

    const todaySponsor = rawSponsor ? {
        ...rawSponsor,
        products: sponsorProducts
    } : {
        id: 'default-sponsor',
        sponsor_date: todayDateStr,
        campaign_message: "Exclusive festival rewards: Shop certified organic groceries & daily essentials with guaranteed cashbacks!",
        merchants: {
            id: 'intrust-partner',
            business_name: 'InTrust Organic Essentials'
        },
        products: sponsorProducts
    };

    // Fetch user's play for today
    const { data: todayPlay } = await supabase
        .from('daily_challenge_plays')
        .select('id, score, cashback_awarded_paise, completed_at')
        .eq('user_id', user.id)
        .eq('challenge_date', new Date().toISOString().split('T')[0])
        .maybeSingle();

    // Fetch existing sponsorships for calendar
    const { data: allSponsorships } = await supabase
        .from('daily_challenge_sponsorships')
        .select('id, sponsor_date, status, merchant_id')
        .gte('sponsor_date', new Date().toISOString().split('T')[0]);

    // Fetch rewards config
    const { data: settings } = await supabase
        .from('marketing_settings')
        .select('value')
        .eq('key', 'rewards_config')
        .maybeSingle();

    return (
        <DailyChallengeClient
            user={user}
            profile={profile}
            merchant={merchant}
            isMerchant={isMerchant}
            categories={categories || []}
            todaySponsor={todaySponsor}
            todayPlay={todayPlay}
            existingSponsorships={allSponsorships || []}
            merchantInventory={merchantInventory}
            rewardsConfig={settings?.value || {}}
        />
    );
}
