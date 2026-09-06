import { createStaticSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import StorefrontV2Client from './StorefrontV2Client';

export const revalidate = 60;

// UUID pattern to detect legacy ID-based URLs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export default async function MerchantStorefrontPage({ params, searchParams }) {
    const { merchantSlug } = await params;
    const searchParamsObj = searchParams ? await searchParams : {};
    const currentPage = Math.max(1, parseInt(searchParamsObj?.page || '1', 10));
    const search = searchParamsObj?.search || '';
    const category = searchParamsObj?.category || '';
    const sub_category = searchParamsObj?.sub_category || '';
    const minPrice = searchParamsObj?.min_price ? parseInt(searchParamsObj.min_price, 10) : null;
    const maxPrice = searchParamsObj?.max_price ? parseInt(searchParamsObj.max_price, 10) : null;
    const brand = searchParamsObj?.brand || '';
    const size = searchParamsObj?.size || '';
    const color = searchParamsObj?.color || '';

    const supabase = createStaticSupabaseClient();
    
    let merchant = null;
    let mergedInventory = [];
    let categories = ['All'];
    let initialTotalCount = 0;
    const PAGE_SIZE = 24;

    const normalizedSlug = merchantSlug?.toLowerCase();

    const initialFilters = {
        search,
        category,
        sub_category,
        min_price: minPrice,
        max_price: maxPrice,
        brand,
        size,
        color
    };

    // Dedicated PLATFORM OFFICIAL STORE branch
    // Resolves /shop/official directly to centralized platform catalog in shopping_products
    if (normalizedSlug === 'official') {
        const [
            inventoryResult,
            platformSettingsResult,
            categoriesResult
        ] = await Promise.all([
            supabase.rpc('get_storefront_page', {
                p_merchant_slug: 'official',
                p_offset: (currentPage - 1) * PAGE_SIZE,
                p_limit: PAGE_SIZE,
                p_search: search,
                p_category: category,
                p_last_id: null,
                p_price_min: minPrice,
                p_price_max: maxPrice,
                p_brand: brand,
                p_size: size,
                p_color: color,
                p_sub_category: sub_category
            }),
            createAdminClient().from('platform_settings').select('value').eq('key', 'platform_store').maybeSingle(),
            supabase.rpc('get_merchant_categories', {
                p_merchant_slug: 'official'
            })
        ]);

        let platformStoreStatus = { is_open: true };
        try {
            if (platformSettingsResult?.data?.value) {
                platformStoreStatus = typeof platformSettingsResult.data.value === 'string'
                    ? JSON.parse(platformSettingsResult.data.value)
                    : platformSettingsResult.data.value;
            }
        } catch (e) {
            console.error('Error parsing platform store status:', e);
        }

        merchant = {
            id: 'official',
            business_name: 'InTrust Official',
            business_address: 'InTrust Official Store, Bhopal, MP',
            shopping_banner_url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80',
            avatar_url: '/icons/intrustLogo.png',
            is_open: platformStoreStatus.is_open ?? true,
            is_verified: true,
            rating: { avg_rating: 4.9, total_ratings: 1250 },
            delivery_time: 'Instant / Same Day',
            slug: 'official'
        };

        if (inventoryResult.error) {
            console.error('Error fetching official storefront inventory:', inventoryResult.error);
            throw new Error(`Failed to fetch official inventory: ${inventoryResult.error.message}`);
        }

        mergedInventory = inventoryResult.data?.items || [];
        categories = ['All', ...(categoriesResult?.data || [])];
        initialTotalCount = inventoryResult.data?.totalCount ?? 0;

        return (
            <div className="w-full">
                <main className="pt-2 sm:pt-4">
                    <StorefrontV2Client
                        merchant={merchant}
                        initialInventory={mergedInventory}
                        initialTotalCount={initialTotalCount}
                        categories={categories}
                        initialFilters={initialFilters}
                        currentPage={currentPage}
                    />
                </main>
            </div>
        );
    }

    // If the segment looks like a UUID, this is a legacy URL — redirect to slug-based URL
    if (UUID_REGEX.test(merchantSlug)) {
        const { data: legacyMerchant } = await supabase
            .from('merchants')
            .select('slug')
            .eq('id', merchantSlug)
            .single();

        if (legacyMerchant?.slug) {
            redirect(`/shop/${legacyMerchant.slug}`);
        }
        return notFound();
    }

    const { data: fetchedMerchant, error: merchantError } = await supabase
        .from('merchants')
        .select(`
            id,
            slug,
            user_id,
            business_name,
            business_address,
            shopping_banner_url,
            is_open,
            subscription_status,
            subscription_expires_at
        `)
        .eq('slug', merchantSlug)
        .eq('status', 'approved')
        .single();

    if (merchantError || !fetchedMerchant) {
        return notFound();
    }

    const now = new Date();
    const hasValidSubscription = fetchedMerchant.subscription_status === 'active' && 
        (!fetchedMerchant.subscription_expires_at || new Date(fetchedMerchant.subscription_expires_at) > now);

    if (!hasValidSubscription) {
        return (
            <div className="w-full flex items-center justify-center py-16 px-4">
                <div className="text-center bg-surface-container-lowest p-8 md:p-12 rounded-[2.5rem] border border-outline-variant/30 shadow-xl max-w-md w-full mx-auto">
                    <div className="w-20 h-20 bg-surface-container-low rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🏪</span>
                    </div>
                    <h1 className="text-2xl font-black text-on-surface mb-3">Store Unavailable</h1>
                    <p className="text-on-surface-variant font-medium text-sm mb-8 leading-relaxed">
                        {fetchedMerchant.business_name} is currently offline. Please explore other amazing stores in your area.
                    </p>
                    <Link href="/shop" className="inline-flex items-center justify-center w-full gap-2 px-6 py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg">
                        Explore Shops
                    </Link>
                </div>
            </div>
        );
    }

    merchant = fetchedMerchant;

    // Run all remaining fetches in parallel
    const adminClient = createAdminClient();
    const [
        profileResult,
        ratingResult,
        inventoryResult,
        categoriesResult,
        platformSettingsResult
    ] = await Promise.all([
        // Avatar
        fetchedMerchant.user_id
            ? adminClient.from('user_profiles').select('avatar_url').eq('id', fetchedMerchant.user_id).maybeSingle()
            : Promise.resolve({ data: null }),
        // Rating
        supabase.from('merchant_rating_stats').select('avg_rating, total_ratings').eq('merchant_id', fetchedMerchant.id).maybeSingle(),
        // Inventory via optimized unified pagination RPC
        supabase.rpc('get_storefront_page', {
            p_merchant_slug: fetchedMerchant.slug,
            p_offset: (currentPage - 1) * PAGE_SIZE,
            p_limit: PAGE_SIZE,
            p_search: search,
            p_category: category,
            p_last_id: null,
            p_price_min: minPrice,
            p_price_max: maxPrice,
            p_brand: brand,
            p_size: size,
            p_color: color,
            p_sub_category: sub_category
        }),
        // Optimized categories query
        supabase.rpc('get_merchant_categories', {
            p_merchant_slug: fetchedMerchant.slug
        })
    ]);

    categories = ['All', ...(categoriesResult?.data || [])];

    merchant.user_profiles = { 
        avatar_url: profileResult.data?.avatar_url || null 
    };
    if (ratingResult.data) merchant.rating = ratingResult.data;

    if (inventoryResult.error) {
        console.error('Error fetching merchant inventory in page:', inventoryResult.error);
        throw new Error(`Failed to fetch merchant inventory: ${inventoryResult.error.message}`);
    }
    mergedInventory = inventoryResult.data?.items || [];
    initialTotalCount = inventoryResult.data?.totalCount ?? 0;

    return (
        <div className="w-full">
            <main className="pt-2 sm:pt-4">
                <StorefrontV2Client
                    merchant={merchant}
                    initialInventory={mergedInventory}
                    initialTotalCount={initialTotalCount}
                    categories={categories}
                    initialFilters={initialFilters}
                    currentPage={currentPage}
                />
            </main>
        </div>
    );
}
