import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import ProductMarketingClient from './ProductMarketingClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductMarketingPage() {
    const supabase = await createServerSupabaseClient();
    const adminSupabase = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check user profile & merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    let merchant = null;
    let merchantInventory = [];

    if (isMerchant) {
        const { data: m } = await supabase
            .from('merchants')
            .select('id, business_name')
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
                    is_active,
                    shopping_products (
                        id, 
                        title, 
                        slug, 
                        product_images, 
                        suggested_retail_price_paise, 
                        category
                    )
                `)
                .eq('merchant_id', merchant.id)
                .limit(50);

            merchantInventory = (inv || []).map(item => {
                const img = (Array.isArray(item.shopping_products?.product_images) && item.shopping_products.product_images[0]) || '/icons/intrustLogo.png';
                const pPrice = item.retail_price_paise 
                    ? Math.round(item.retail_price_paise / 100) 
                    : (item.shopping_products?.suggested_retail_price_paise ? Math.round(item.shopping_products.suggested_retail_price_paise / 100) : 199);
                return {
                    id: item.id,
                    product_id: item.shopping_products?.id || item.id,
                    product_name: item.custom_title || item.shopping_products?.title || 'Store Product',
                    title: item.custom_title || item.shopping_products?.title || 'Store Product',
                    price: pPrice,
                    stock_quantity: item.stock_quantity ?? 10,
                    image_url: img,
                    image: img,
                    slug: item.shopping_products?.slug || item.id,
                    category: item.shopping_products?.category || 'General',
                    is_merchant_inventory: true
                };
            });
        }
    }

    // 1. Fetch Admin Curated Official Products Selection from marketing_settings
    const { data: officialSettings } = await adminSupabase
        .from('marketing_settings')
        .select('value')
        .eq('key', 'official_marketing_products')
        .maybeSingle();

    const curatedIds = officialSettings?.value?.product_ids || [];

    // 2. Query strictly InTrust platform products (submitted_by_merchant_id IS NULL)
    let platformQuery = adminSupabase
        .from('shopping_products')
        .select(`
            id,
            title,
            slug,
            product_images,
            suggested_retail_price_paise,
            wholesale_price_paise,
            category,
            is_active
        `)
        .is('submitted_by_merchant_id', null)
        .eq('is_active', true);

    if (curatedIds.length > 0) {
        platformQuery = platformQuery.in('id', curatedIds);
    }

    const { data: rawPlatformProducts } = await platformQuery.limit(80);

    const platformProducts = (rawPlatformProducts || []).map(p => {
        const img = (Array.isArray(p.product_images) && p.product_images[0]) || '/icons/intrustLogo.png';
        const price = p.suggested_retail_price_paise 
            ? Math.round(p.suggested_retail_price_paise / 100)
            : (p.wholesale_price_paise ? Math.round((p.wholesale_price_paise * 1.25) / 100) : 249);
        return {
            id: p.id,
            title: p.title || 'InTrust Certified Item',
            name: p.title || 'InTrust Certified Item',
            slug: p.slug || p.id,
            price: price,
            image_url: img,
            image: img,
            category: p.category || 'General',
            promo_cashback_paise: 10000,
            referral_cashback_paise: 5000,
            is_active: p.is_active,
            is_merchant_inventory: false
        };
    });

    // Fetch rewards config
    const { data: settings } = await supabase
        .from('marketing_settings')
        .select('value')
        .eq('key', 'rewards_config')
        .maybeSingle();

    // Fetch user's existing share links to compute authentic per-product share counts
    const { data: userShareLinks } = await supabase
        .from('marketing_share_links')
        .select('id, code, product_id, clicks_count, shares_count, registrations_count, orders_count')
        .eq('user_id', user.id);

    return (
        <ProductMarketingClient
            user={user}
            merchant={merchant}
            isMerchant={isMerchant}
            initialPlatformProducts={platformProducts}
            initialMerchantInventory={merchantInventory}
            initialUserShareLinks={userShareLinks || []}
            rewardsConfig={settings?.value || {}}
        />
    );
}
