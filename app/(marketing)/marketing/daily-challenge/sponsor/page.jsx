import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import DailyChallengeSponsorClient from './DailyChallengeSponsorClient';

export const metadata = {
    title: 'Sponsor Daily Challenge | InTrust Marketing',
    description: 'Promote your local store products to thousands of active daily trivia quiz players across India with verified tax invoice.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DailyChallengeSponsorPage() {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login?returnUrl=/marketing/daily-challenge/sponsor');
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    if (!isMerchant) {
        // Only merchants can book sponsorships; redirect non-merchants to the daily challenge quiz
        redirect('/marketing/daily-challenge');
    }

    let merchant = null;
    let merchantInventory = [];

    // Fetch primary merchant record
    let { data: m } = await adminSupabase
        .from('merchants')
        .select('id, business_name, store_name, business_phone, business_email, wallet_balance_paise, gstin, city, state')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!m && (profile?.role === 'admin' || profile?.role === 'super_admin')) {
        // Fallback for admin accounts to inspect merchant inventory
        const { data: runnrMerchant } = await adminSupabase
            .from('merchants')
            .select('id, business_name, store_name, business_phone, business_email, wallet_balance_paise, gstin, city, state')
            .ilike('business_name', '%runnr%')
            .maybeSingle();
        m = runnrMerchant;
    }

    // Fetch user's customer wallet balance
    const { data: custWallet } = await adminSupabase
        .from('customer_wallets')
        .select('id, balance_paise')
        .eq('user_id', user.id)
        .maybeSingle();

    const merchantPaise = Number(m?.wallet_balance_paise || 0);
    const customerPaise = Number(custWallet?.balance_paise || 0);
    const profilePaise = Math.round(Number(profile?.wallet_balance || 0) * 100);
    const effectiveWalletPaise = Math.max(merchantPaise, customerPaise, profilePaise);

    if (m) {
        m.wallet_balance_paise = effectiveWalletPaise;
    } else {
        m = {
            id: user.id,
            business_name: profile?.full_name || 'InTrust Partner Store',
            store_name: profile?.full_name || 'InTrust Partner Store',
            wallet_balance_paise: effectiveWalletPaise,
            city: 'India',
            state: 'India'
        };
    }
    merchant = m;

    if (merchant?.id) {
        // Helper to extract first valid image URL safely from array, JSON string, or single string
        const extractImage = (prodImages, customImages) => {
            const tryParse = (val) => {
                if (!val) return null;
                if (Array.isArray(val) && val.length > 0) return val[0];
                if (typeof val === 'string') {
                    if (val.startsWith('[') || val.startsWith('{')) {
                        try {
                            const parsed = JSON.parse(val);
                            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
                        } catch (e) {}
                    }
                    if (val.startsWith('http') || val.startsWith('/')) return val;
                }
                return null;
            };

            return tryParse(customImages) || tryParse(prodImages) || '/icons/intrustLogo.png';
        };

        // 1. Fetch ALL rows from merchant_inventory with joined product metadata (up to 500 items)
        const { data: inv } = await adminSupabase
            .from('merchant_inventory')
            .select(`
                id, 
                product_id,
                custom_title, 
                custom_description,
                custom_images,
                retail_price_paise, 
                stock_quantity,
                is_active,
                is_platform_product,
                shopping_products (
                    id, 
                    title, 
                    slug, 
                    product_images, 
                    suggested_retail_price_paise,
                    category,
                    sub_category
                )
            `)
            .eq('merchant_id', merchant.id)
            .limit(500);

        const invItems = (inv || []).map(item => {
            const resolvedImg = extractImage(item.shopping_products?.product_images, item.custom_images);
            const resolvedPrice = item.retail_price_paise 
                ? Math.round(item.retail_price_paise / 100) 
                : (item.shopping_products?.suggested_retail_price_paise 
                    ? Math.round(item.shopping_products.suggested_retail_price_paise / 100) 
                    : 199);

            return {
                id: item.id,
                product_id: item.product_id || item.shopping_products?.id || item.id,
                product_name: item.custom_title || item.shopping_products?.title || 'Store Item',
                price: resolvedPrice,
                image_url: resolvedImg,
                slug: item.shopping_products?.slug || item.id,
                stock_quantity: item.stock_quantity ?? 15,
                category: item.shopping_products?.category || 'Store Inventory',
                sub_category: item.shopping_products?.sub_category || '',
                is_own: true
            };
        });

        // 2. Fetch custom products directly submitted by this merchant in shopping_products
        const { data: customProds } = await adminSupabase
            .from('shopping_products')
            .select('id, title, slug, product_images, suggested_retail_price_paise, category, sub_category')
            .eq('submitted_by_merchant_id', merchant.id)
            .limit(500);

        const customItems = (customProds || []).map(p => ({
            id: p.id,
            product_id: p.id,
            product_name: p.title,
            price: Math.round((p.suggested_retail_price_paise || 24900) / 100),
            image_url: extractImage(p.product_images, null),
            slug: p.slug,
            stock_quantity: 20,
            category: p.category || 'Store Product',
            sub_category: p.sub_category || '',
            is_own: true
        }));

        // Combine unique by product_id / id
        const seen = new Set();
        merchantInventory = [...invItems, ...customItems].filter(item => {
            const key = item.product_id || item.id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Fallback products if store has no listed items yet
    if (merchantInventory.length === 0) {
        const { data: defaultItems } = await adminSupabase
            .from('shopping_products')
            .select('id, title, slug, product_images, suggested_retail_price_paise, category')
            .eq('is_active', true)
            .limit(20);

        merchantInventory = (defaultItems || []).map(p => ({
            id: p.id,
            product_name: p.title,
            price: Math.round((p.suggested_retail_price_paise || 24900) / 100),
            image_url: (Array.isArray(p.product_images) && p.product_images[0]) || '/icons/intrustLogo.png',
            slug: p.slug,
            stock_quantity: 50,
            category: p.category || 'Platform Partner',
            is_own: false
        }));
    }

    // Fetch existing sponsorships for the calendar
    const { data: existingSponsorships } = await adminSupabase
        .from('daily_challenge_sponsorships')
        .select('id, sponsor_date, status, merchant_id, fee_paise, campaign_message')
        .gte('sponsor_date', new Date().toISOString().split('T')[0])
        .order('sponsor_date', { ascending: true })
        .limit(60);

    // Fetch dynamic rewards configuration
    let rewardsConfig = {
        sponsorship_fee_paise: 99900,
        daily_challenge_reward_paise: 2500
    };
    try {
        const { data: cfgRow } = await supabase
            .from('marketing_settings')
            .select('value')
            .eq('key', 'rewards_config')
            .maybeSingle();
        if (cfgRow?.value) {
            rewardsConfig = { ...rewardsConfig, ...cfgRow.value };
        }
    } catch (e) {
        console.error('Error loading rewards config:', e);
    }

    return (
        <DailyChallengeSponsorClient
            user={user}
            profile={profile}
            merchant={merchant}
            walletBalancePaise={effectiveWalletPaise}
            merchantInventory={merchantInventory}
            existingSponsorships={existingSponsorships || []}
            rewardsConfig={rewardsConfig}
        />
    );
}
