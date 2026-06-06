import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import StorefrontV2Client from './StorefrontV2Client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export const dynamic = 'force-dynamic';

// UUID pattern to detect legacy ID-based URLs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export default async function MerchantStorefrontPage({ params }) {
    const { merchantSlug } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();

    let merchant = null;
    let mergedInventory = [];
    let customerResult = { data: null };
    let categories = ['All'];
    let initialTotalCount = 0;
    const PAGE_SIZE = 24;

    const normalizedSlug = merchantSlug?.toLowerCase();

    if (normalizedSlug === 'official') {
        const [storefrontResult, officialCustomerResult, platformSettingsResult, categoriesResult] = await Promise.all([
            // Fetch initial products using optimized unified pagination RPC (including slug and other essential columns)
            supabase.rpc('get_storefront_page', {
                p_merchant_slug: 'official',
                p_offset: 0,
                p_limit: PAGE_SIZE,
                p_search: '',
                p_category: ''
            }),
            user
                ? supabase.from('user_profiles').select('*').eq('id', user.id).single()
                : Promise.resolve({ data: null }),
            createAdminClient().from('platform_settings').select('value').eq('key', 'platform_store').single(),
            supabase
                .from('shopping_products')
                .select('category')
                .eq('platform_listed', true)
                .is('deleted_at', null)
        ]);

        categories = ['All', ...new Set((categoriesResult?.data || []).map(p => p.category).filter(Boolean))];

        let officialStoreStatus = { is_open: true };
        try {
            if (platformSettingsResult?.data?.value) {
                officialStoreStatus = typeof platformSettingsResult.data.value === 'string' 
                    ? JSON.parse(platformSettingsResult.data.value)
                    : platformSettingsResult.data.value;
            }
        } catch (e) {
            console.error('Error parsing platform status:', e);
        }

        merchant = {
            id: 'official',
            slug: 'official',
            business_name: 'Intrust Official',
            business_address: 'Premium Hub',
            rating: { avg_rating: 4.9, total_ratings: 50000 },
            user_profiles: { avatar_url: '/icons/intrustLogo.png' },
            is_open: !!officialStoreStatus.is_open
        };

        customerResult = officialCustomerResult;

        if (storefrontResult.error) {
            console.error('Error fetching platform products in page:', storefrontResult.error);
        }
        mergedInventory = storefrontResult.data?.items || [];
        initialTotalCount = storefrontResult.data?.totalCount ?? 0;
    } else {
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
                <div className="min-h-screen flex flex-col bg-[#f7f8fa] dark:bg-[#080a10]">
                    <Navbar />
                    <main className="flex-1 flex items-center justify-center pt-20 px-4 h-[70vh]">
                        <div className="text-center bg-white dark:bg-[#0c0e16] p-8 md:p-12 rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-xl max-w-md w-full mx-auto">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">🏪</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">Store Unavailable</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-8 leading-relaxed">
                                {fetchedMerchant.business_name} is currently offline. Please explore other amazing stores in your area.
                            </p>
                            <Link href="/shop" className="inline-flex items-center justify-center w-full gap-2 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg">
                                Explore Shops
                            </Link>
                        </div>
                    </main>
                    <Footer />
                    <CustomerBottomNav />
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
            merchantCustomerResult,
            categoriesResult
        ] = await Promise.all([
            // Avatar
            fetchedMerchant.user_id
                ? adminClient.from('user_profiles').select('avatar_url').eq('id', fetchedMerchant.user_id).single()
                : Promise.resolve({ data: null }),
            // Rating
            supabase.from('merchant_rating_stats').select('avg_rating, total_ratings').eq('merchant_id', fetchedMerchant.id).single(),
            // Inventory via optimized unified pagination RPC (including slug and other essential columns)
            supabase.rpc('get_storefront_page', {
                p_merchant_slug: fetchedMerchant.slug,
                p_offset: 0,
                p_limit: PAGE_SIZE,
                p_search: '',
                p_category: ''
            }),
            // Customer profile
            user
                ? supabase.from('user_profiles').select('id, wallet_balance_paise').eq('id', user.id).single()
                : Promise.resolve({ data: null }),
            // Category query
            supabase
                .from('merchant_inventory')
                .select('shopping_products!inner(category)')
                .eq('merchant_id', fetchedMerchant.id)
                .eq('is_active', true)
                .is('shopping_products.deleted_at', null)
        ]);

        categories = ['All', ...new Set((categoriesResult?.data || []).map(r => r.shopping_products?.category).filter(Boolean))];

        customerResult = merchantCustomerResult;

        merchant.user_profiles = { avatar_url: profileResult.data?.avatar_url || null };
        if (ratingResult.data) merchant.rating = ratingResult.data;

        if (inventoryResult.error) {
            console.error('Error fetching merchant inventory in page:', inventoryResult.error);
        }
        mergedInventory = inventoryResult.data?.items || [];
        initialTotalCount = inventoryResult.data?.totalCount ?? 0;

        return (
            <div className="min-h-screen">
                <Navbar />
                <main className="pt-20 md:pt-24">
                    <StorefrontV2Client
                        merchant={merchant}
                        initialInventory={mergedInventory}
                        initialTotalCount={initialTotalCount}
                        customer={customerResult.data}
                        categories={categories}
                    />
                </main>
                <Footer />
                <CustomerBottomNav />
            </div>
        );
    }

    // customerResult already resolved in Promise.all above; use it directly
    const customerProfile = customerResult.data || null;

    return (
        <div className="min-h-screen">
            <Navbar />
            
            <main className="pt-20 md:pt-24">
                <StorefrontV2Client 
                    merchant={merchant}
                    initialInventory={mergedInventory}
                    initialTotalCount={initialTotalCount}
                    customer={customerProfile} 
                    categories={categories}
                />
            </main>

            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
