import { createStaticSupabaseClient, createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
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
        const now = new Date().toISOString();
        const [
            inventoryResult,
            platformSettingsResult,
            categoriesResult,
            flashSaleResult
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
            }),
            createAdminClient()
                .from('flash_sale_items')
                .select(`
                    id,
                    product_id,
                    discount_percent,
                    sale_price_paise,
                    position,
                    ends_at,
                    starts_at,
                    shopping_products:product_id (
                        id,
                        slug,
                        title,
                        product_images,
                        mrp_paise,
                        suggested_retail_price_paise,
                        admin_stock,
                        is_active
                    )
                `)
                .eq('is_active', true)
                .or(`ends_at.is.null,ends_at.gt.${now}`)
                .lte('starts_at', now)
                .order('position', { ascending: true })
                .limit(8)
        ]);

        const rawFlashItems = (flashSaleResult.data || [])
            .filter(r => r.shopping_products && r.shopping_products.is_active)
            .map(r => ({
                id: `flash-${r.id}`,
                product_id: r.shopping_products.id,
                name: r.shopping_products.title,
                original_price: r.shopping_products.mrp_paise || r.shopping_products.suggested_retail_price_paise,
                sale_price: r.sale_price_paise,
                discount_percent: r.discount_percent,
                thumbnail: r.shopping_products.product_images?.[0] || null,
                url: `/shop/product/${r.shopping_products.slug}`,
                ends_at: r.ends_at,
                shopping_products: {
                    admin_stock: r.shopping_products.admin_stock
                }
            }));

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
                        initialFlashSaleItems={rawFlashItems}
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

    // Fellow Merchant Protection: Merchants cannot view competitor storefronts
    try {
        const sessionClient = await createServerSupabaseClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (user) {
            const { data: viewerMerchant } = await createAdminClient()
                .from('merchants')
                .select('id, business_name')
                .eq('user_id', user.id)
                .maybeSingle();

            if (viewerMerchant && viewerMerchant.id !== fetchedMerchant.id) {
                return (
                    <div className="w-full min-h-[60vh] flex items-center justify-center py-16 px-4">
                        <div className="text-center bg-white dark:bg-slate-900 p-8 md:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full mx-auto space-y-4">
                            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                                <span className="text-3xl">🛡️</span>
                            </div>
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                    InTrust Marketplace Policy
                                </span>
                                <h2 className="text-xl font-black text-slate-950 dark:text-white">
                                    Fellow Merchant Notice
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                    To protect partner confidentiality and proprietary pricing, merchants cannot browse fellow merchant storefronts.
                                </p>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 text-left text-xs space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-bold">Your Store:</span>
                                    <span className="text-slate-900 dark:text-white font-black">{viewerMerchant.business_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500 font-bold">Requested Store:</span>
                                    <span className="text-slate-900 dark:text-white font-black">{fetchedMerchant.business_name}</span>
                                </div>
                            </div>
                            <div className="pt-2 flex flex-col sm:flex-row gap-2">
                                <Link href="/merchant" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all text-center">
                                    My Dashboard
                                </Link>
                                <Link href="/marketing/daily-challenge" className="flex-1 py-3 bg-slate-100 text-slate-800 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all text-center">
                                    Daily Challenge
                                </Link>
                            </div>
                        </div>
                    </div>
                );
            }
        }
    } catch (e) {
        // Continue if session verification is unavailable
    }

    merchant = fetchedMerchant;

    // Run all remaining fetches in parallel
    const adminClient = createAdminClient();
    const nowIso = new Date().toISOString();
    const [
        profileResult,
        ratingResult,
        inventoryResult,
        categoriesResult,
        platformSettingsResult,
        flashSaleResult
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
        }),
        // Platform settings
        adminClient.from('platform_settings').select('value').eq('key', 'platform_store').maybeSingle(),
        // Flash sale active platform products
        adminClient
            .from('flash_sale_items')
            .select(`
                id,
                product_id,
                discount_percent,
                sale_price_paise,
                position,
                ends_at,
                starts_at,
                shopping_products:product_id (
                    id,
                    slug,
                    title,
                    product_images,
                    mrp_paise,
                    suggested_retail_price_paise,
                    admin_stock,
                    is_active
                )
            `)
            .eq('is_active', true)
            .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
            .lte('starts_at', nowIso)
            .order('position', { ascending: true })
            .limit(8)
    ]);

    const rawFlashItems = (flashSaleResult.data || [])
        .filter(r => r.shopping_products && r.shopping_products.is_active)
        .map(r => ({
            id: `flash-${r.id}`,
            product_id: r.shopping_products.id,
            name: r.shopping_products.title,
            original_price: r.shopping_products.mrp_paise || r.shopping_products.suggested_retail_price_paise,
            sale_price: r.sale_price_paise,
            discount_percent: r.discount_percent,
            thumbnail: r.shopping_products.product_images?.[0] || null,
            url: `/shop/product/${r.shopping_products.slug}`,
            ends_at: r.ends_at,
            shopping_products: {
                admin_stock: r.shopping_products.admin_stock
            }
        }));

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
                    initialFlashSaleItems={rawFlashItems}
                />
            </main>
        </div>
    );
}
