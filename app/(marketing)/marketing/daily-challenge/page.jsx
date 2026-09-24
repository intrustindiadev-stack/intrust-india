import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import DailyChallengeClient from './DailyChallengeClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DailyChallengePage() {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();

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
            const { data: inv } = await adminSupabase
                .from('merchant_inventory')
                .select(`
                    id, 
                    custom_title, 
                    retail_price_paise, 
                    stock_quantity,
                    shopping_products (
                        id, 
                        title, 
                        slug, 
                        product_images, 
                        suggested_retail_price_paise
                    )
                `)
                .eq('merchant_id', merchant.id)
                .limit(20);

            merchantInventory = (inv || []).map(item => ({
                id: item.id,
                product_name: item.custom_title || item.shopping_products?.title || 'Store Item',
                price: Math.round((item.retail_price_paise || item.shopping_products?.suggested_retail_price_paise || 19900) / 100),
                image_url: (Array.isArray(item.shopping_products?.product_images) && item.shopping_products.product_images[0]) || '/icons/intrustLogo.png',
                slug: item.shopping_products?.slug || item.id
            }));
        }

        // If merchant has not listed custom inventory, offer active platform products so they can still sponsor
        if (merchantInventory.length === 0) {
            const { data: defaultItems } = await adminSupabase
                .from('shopping_products')
                .select('id, title, slug, product_images, suggested_retail_price_paise')
                .eq('is_active', true)
                .limit(10);

            merchantInventory = (defaultItems || []).map(p => ({
                id: p.id,
                product_name: p.title,
                price: Math.round((p.suggested_retail_price_paise || 24900) / 100),
                image_url: (Array.isArray(p.product_images) && p.product_images[0]) || '/icons/intrustLogo.png',
                slug: p.slug
            }));
        }
    }

    // Fetch active categories
    const { data: categories } = await supabase
        .from('daily_challenge_categories')
        .select('id, slug, title, icon_name, description')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    // Fetch today's live or booked sponsor in Indian Standard Time (Asia/Kolkata)
    const todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    
    // Calculate seconds remaining until 12:00:00 AM IST midnight
    const now = new Date();
    const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istString);
    const nextMidnightIST = new Date(istDate);
    nextMidnightIST.setHours(24, 0, 0, 0);
    const secondsUntilMidnightIST = Math.max(0, Math.floor((nextMidnightIST - istDate) / 1000));

    const { data: rawSponsor } = await supabase
        .from('daily_challenge_sponsorships')
        .select(`
            id, sponsor_date, campaign_message, product_ids, status,
            merchants (id, business_name, store_name, user_id)
        `)
        .eq('sponsor_date', todayDateStr)
        .in('status', ['live', 'booked', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    let sponsorAvatarUrl = null;
    if (rawSponsor?.merchants?.user_id) {
        const { data: sponsorProfile } = await adminSupabase
            .from('user_profiles')
            .select('avatar_url, full_name')
            .eq('id', rawSponsor.merchants.user_id)
            .maybeSingle();
        if (sponsorProfile?.avatar_url) {
            sponsorAvatarUrl = sponsorProfile.avatar_url;
        }
    }

    let sponsorProducts = [];
    if (rawSponsor?.product_ids && Array.isArray(rawSponsor.product_ids) && rawSponsor.product_ids.length > 0) {
        // Try inventory first
        const { data: invProds } = await adminSupabase
            .from('merchant_inventory')
            .select(`
                id, 
                custom_title, 
                retail_price_paise,
                shopping_products (
                    id, 
                    title, 
                    slug, 
                    product_images, 
                    suggested_retail_price_paise
                )
            `)
            .in('id', rawSponsor.product_ids);

        if (invProds && invProds.length > 0) {
            sponsorProducts = invProds.map(item => ({
                id: item.id,
                product_name: item.custom_title || item.shopping_products?.title || 'Product',
                price: Math.round((item.retail_price_paise || item.shopping_products?.suggested_retail_price_paise || 19900) / 100),
                image_url: (Array.isArray(item.shopping_products?.product_images) && item.shopping_products.product_images[0]) || '/icons/intrustLogo.png',
                slug: item.shopping_products?.slug || item.id
            }));
        } else {
            // Direct platform products
            const { data: directProds } = await adminSupabase
                .from('shopping_products')
                .select('id, title, slug, product_images, suggested_retail_price_paise')
                .in('id', rawSponsor.product_ids);

            if (directProds && directProds.length > 0) {
                sponsorProducts = directProds.map(p => ({
                    id: p.id,
                    product_name: p.title,
                    price: Math.round((p.suggested_retail_price_paise || 24900) / 100),
                    image_url: (Array.isArray(p.product_images) && p.product_images[0]) || '/icons/intrustLogo.png',
                    slug: p.slug
                }));
            }
        }
    }

    // If no sponsor products found or no sponsor, grab top platform partner products
    if (sponsorProducts.length === 0) {
        const { data: featuredProds } = await adminSupabase
            .from('shopping_products')
            .select('id, title, slug, product_images, suggested_retail_price_paise')
            .eq('is_active', true)
            .limit(4);

        sponsorProducts = (featuredProds || []).map(p => ({
            id: p.id,
            product_name: p.title,
            price: Math.round((p.suggested_retail_price_paise || 24900) / 100),
            image_url: (Array.isArray(p.product_images) && p.product_images[0]) || '/icons/intrustLogo.png',
            slug: p.slug
        }));

        if (sponsorProducts.length === 0) {
            sponsorProducts = [
                {
                    id: 'default-prod-1',
                    product_name: 'Wireless Bluetooth ANC Earbuds',
                    price: 1499,
                    image_url: '/marketing/prizes/anc_earbuds.jpg',
                    slug: 'official'
                },
                {
                    id: 'default-prod-2',
                    product_name: 'Smart AMOLED Fitness Tracker',
                    price: 1899,
                    image_url: '/marketing/prizes/smartwatch.jpg',
                    slug: 'official'
                },
                {
                    id: 'default-prod-3',
                    product_name: 'Executive Metal Roller Pen & Journal Kit',
                    price: 799,
                    image_url: '/marketing/prizes/executive_kit.jpg',
                    slug: 'official'
                }
            ];
        }
    }

    const todaySponsor = rawSponsor ? {
        ...rawSponsor,
        avatar_url: sponsorAvatarUrl,
        products: sponsorProducts
    } : {
        id: 'default-sponsor',
        sponsor_date: todayDateStr,
        campaign_message: "Exclusive festival rewards: Shop certified organic groceries & daily essentials with guaranteed cashbacks!",
        avatar_url: '/icons/intrustLogo.png',
        merchants: {
            id: 'intrust-partner',
            business_name: 'InTrust Organic Essentials',
            store_name: 'InTrust Organic Essentials'
        },
        products: sponsorProducts
    };

    // Fetch user's play for today in IST
    const { data: todayPlay } = await supabase
        .from('daily_challenge_plays')
        .select('id, score, cashback_awarded_paise, completed_at')
        .eq('user_id', user.id)
        .eq('challenge_date', todayDateStr)
        .maybeSingle();

    // Fetch user's live quiz streak
    let userStreak = { current_streak: 0, highest_streak: 0, played_today: !!todayPlay, freezes_left: 1 };
    try {
        const { data: sData } = await supabase.rpc('get_user_quiz_streak');
        if (sData) {
            userStreak = {
                ...sData,
                played_today: !!todayPlay || !!sData.played_today,
                current_streak: (!!todayPlay || !!sData.played_today)
                    ? Math.max(1, Number(sData.current_streak || 1))
                    : Number(sData.current_streak || 0)
            };
        }
    } catch (e) {
        console.error('Error fetching quiz streak:', e);
    }

    // Fetch real questions from question bank
    const { data: dbQuestions } = await supabase
        .from('daily_challenge_questions')
        .select('id, category_id, question, options, correct_option_index, explanation, points')
        .order('created_at', { ascending: false })
        .limit(250);

    // Fetch streak config & rewards config
    const [streakRes, rewardsRes, sponsorshipsRes] = await Promise.allSettled([
        supabase.from('marketing_settings').select('value').eq('key', 'streak_config').maybeSingle(),
        supabase.from('marketing_settings').select('value').eq('key', 'rewards_config').maybeSingle(),
        supabase.from('daily_challenge_sponsorships').select('id, sponsor_date, status').gte('sponsor_date', todayDateStr).in('status', ['live', 'booked'])
    ]);

    const streakConfig = streakRes.status === 'fulfilled' && streakRes.value.data?.value ? streakRes.value.data.value : {};
    const rewardsConfig = rewardsRes.status === 'fulfilled' && rewardsRes.value.data?.value ? rewardsRes.value.data.value : {};
    const allSponsorships = sponsorshipsRes.status === 'fulfilled' && sponsorshipsRes.value.data ? sponsorshipsRes.value.data : [];

    // Fetch customer wallet balance
    const { data: custWallet } = await supabase
        .from('customer_wallets')
        .select('balance_paise')
        .eq('user_id', user.id)
        .maybeSingle();

    return (
        <DailyChallengeClient
            user={user}
            profile={profile}
            merchant={merchant}
            customerWalletBalancePaise={custWallet?.balance_paise || 0}
            isMerchant={isMerchant}
            categories={categories || []}
            initialQuestions={dbQuestions || []}
            initialStreak={userStreak}
            streakConfig={streakConfig || {}}
            todaySponsor={todaySponsor}
            todayPlay={todayPlay}
            todayDateStr={todayDateStr}
            secondsUntilMidnightIST={secondsUntilMidnightIST}
            existingSponsorships={allSponsorships || []}
            merchantInventory={merchantInventory}
            rewardsConfig={rewardsConfig || {}}
        />
    );
}
