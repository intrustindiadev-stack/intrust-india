import { createStaticSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ShoppingBag } from 'lucide-react';

import ShopHubClient from './ShopHubClient';
import Breadcrumbs from '@/components/giftcards/Breadcrumbs';
import UserShopHeaderActions from './UserShopHeaderActions';

// ISR: cache the merchant list for 60 seconds at the edge.
// Real-time open/closed status is handled client-side via WebSocket (ShopHubClient).
export const revalidate = 60;

export default async function MerchantHubPage() {
    const supabase = createStaticSupabaseClient();
    const adminClient = createAdminClient();

    const nowIso = new Date().toISOString();

    // Batch 1: Independent fetches using static client (cachable)
    const [
        merchantsResult,
        platformResult,
        categoriesResult
    ] = await Promise.all([
        supabase
            .from('merchants')
            .select('id, slug, user_id, business_name, business_address, shopping_banner_url, is_open, subscription_status, subscription_expires_at')
            .eq('status', 'approved')
            .eq('subscription_status', 'active')
            .or(`subscription_expires_at.is.null,subscription_expires_at.gt.${nowIso}`)
            .order('business_name', { ascending: true }),
        supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'platform_store')
            .single(),
        supabase
            .from('shopping_categories')
            .select('*')
            .eq('is_active', true)
    ]);

    if (merchantsResult.error) {
        console.error('Error fetching merchants in shop page (will render empty):', merchantsResult.error);
    }

    if (platformResult.error) {
        console.error('Error fetching platform settings in shop page (will use defaults):', platformResult.error);
    }

    let merchants = merchantsResult.data || [];
    const userIds = merchants.map(m => m.user_id).filter(Boolean);
    const merchantIds = merchants.map(m => m.id);

    // Batch 2: Dependent fetches using active merchants' IDs (ratings, profiles)
    const [
        profilesResult,
        ratingsResult
    ] = await Promise.all([
        userIds.length > 0
            ? adminClient.from('user_profiles').select('id, avatar_url, full_name').in('id', userIds)
            : Promise.resolve({ data: [] }),
        merchantIds.length > 0
            ? supabase.from('merchant_rating_stats').select('merchant_id, avg_rating, total_ratings').in('merchant_id', merchantIds)
            : Promise.resolve({ data: [] })
    ]);

    if (profilesResult.error) {
        console.warn('Error fetching profiles in shop page:', profilesResult.error);
    }

    if (ratingsResult.error) {
        console.warn('Error fetching ratings in shop page:', ratingsResult.error);
    }

    let platformStatus = { is_open: true };
    try {
        if (platformResult?.data?.value) {
            platformStatus = typeof platformResult.data.value === 'string'
                ? JSON.parse(platformResult.data.value)
                : platformResult.data.value;
        }
    } catch (e) {
        console.error('Error parsing platform status in shop:', e);
    }

    if (userIds.length > 0) {
        const profileMap = Object.fromEntries((profilesResult.data || []).map(p => [p.id, p]));
        merchants = merchants.map(m => ({
            ...m,
            user_profiles: profileMap[m.user_id] || { avatar_url: null, full_name: null }
        }));
    }

    const ratingsMap = Object.fromEntries(
        (ratingsResult.data || []).map(r => [r.merchant_id, r])
    );

    const allMerchants = [
        {
            id: 'official',
            slug: 'official',
            business_name: 'Intrust Official',
            business_address: null,
            user_profiles: { avatar_url: '/icons/intrustLogo.png', full_name: null },
            is_open: !!platformStatus.is_open
        },
        ...merchants
    ];

    // Fetch real inventory for active merchants so store cards showcase THEIR products only
    let merchantProductsMap = {};
    if (merchantIds.length > 0) {
        try {
            const { data: inventoryItems } = await supabase
                .from('merchant_inventory')
                .select(`
                    id,
                    merchant_id,
                    product_id,
                    retail_price_paise,
                    stock_quantity,
                    custom_title,
                    shopping_products (
                        id,
                        title,
                        slug,
                        product_images,
                        category,
                        suggested_retail_price_paise
                    )
                `)
                .in('merchant_id', merchantIds)
                .eq('is_active', true)
                .gt('stock_quantity', 0)
                .limit(80);

            if (inventoryItems) {
                inventoryItems.forEach(item => {
                    if (!merchantProductsMap[item.merchant_id]) {
                        merchantProductsMap[item.merchant_id] = [];
                    }
                    if (merchantProductsMap[item.merchant_id].length < 4) {
                        merchantProductsMap[item.merchant_id].push({
                            id: item.product_id || item.id,
                            title: item.custom_title || item.shopping_products?.title || 'Product',
                            slug: item.shopping_products?.slug || item.product_id,
                            selling_price: Math.round((item.retail_price_paise || 0) / 100),
                            images: item.shopping_products?.product_images || [],
                            category: item.shopping_products?.category || 'General'
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('Could not fetch merchant inventory items:', e);
        }
    }

    const categories = categoriesResult?.data || [];

    return (
        <div className="w-full space-y-6">
            <ShopHubClient 
                merchants={allMerchants} 
                ratingsMap={ratingsMap} 
                categories={categories} 
                merchantProductsMap={merchantProductsMap}
            />
        </div>
    );
}


