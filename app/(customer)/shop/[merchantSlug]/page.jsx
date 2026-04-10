import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
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

    if (merchantSlug === 'official') {
        merchant = {
            id: 'official',
            slug: 'official',
            business_name: 'Intrust Official',
            business_address: 'Premium Hub',
            rating: { avg_rating: 4.9, total_ratings: 50000 },
            user_profiles: { avatar_url: '/icons/intrustLogo.png' }
        };

        const [platformProductsResult, officialCustomerResult] = await Promise.all([
            supabase
                .from('shopping_products')
                .select('id, slug, title, description, product_images, category, mrp_paise, suggested_retail_price_paise, admin_stock, is_active')
                .eq('is_active', true)
                .gt('admin_stock', 0),
            user
                ? supabase.from('user_profiles').select('*').eq('id', user.id).single()
                : Promise.resolve({ data: null }),
        ]);

        customerResult = officialCustomerResult;

        const { data: platformProducts, error: platformError } = platformProductsResult;
        if (platformError) console.error('Error fetching platform products:', platformError);

        mergedInventory = (platformProducts || []).map(p => ({
            id: `platform-${p.id}`,
            product_id: p.id,
            retail_price_paise: p.suggested_retail_price_paise,
            stock_quantity: p.admin_stock,
            merchant_id: null,
            is_active: true,
            is_platform_direct: true,
            shopping_products: p
        }));
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
                shopping_banner_url
            `)
            .eq('slug', merchantSlug)
            .eq('status', 'approved')
            .single();

        if (merchantError || !fetchedMerchant) {
            return (
                <div className="p-20 text-center">
                    <h1 className="text-3xl font-bold text-red-500">Merchant Not Found</h1>
                    <p className="mt-4">Slug: {merchantSlug}</p>
                    <p className="mt-2 text-red-400">{merchantError?.message || 'No merchant row returned (possible RLS issue or unapproved)'}</p>
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
            customerResult
        ] = await Promise.all([
            // Avatar
            fetchedMerchant.user_id
                ? adminClient.from('user_profiles').select('avatar_url').eq('id', fetchedMerchant.user_id).single()
                : Promise.resolve({ data: null }),
            // Rating
            supabase.from('merchant_rating_stats').select('avg_rating, total_ratings').eq('merchant_id', fetchedMerchant.id).single(),
            // Inventory
            supabase
                .from('merchant_inventory')
                .select(`id, retail_price_paise, stock_quantity, merchant_id, product_id, is_active, custom_title, custom_description, shopping_products!inner (id, slug, title, description, product_images, category, mrp_paise, suggested_retail_price_paise)`)
                .eq('merchant_id', fetchedMerchant.id)
                .eq('is_active', true)
                .gt('stock_quantity', 0),
            // Customer profile
            user
                ? supabase.from('user_profiles').select('*').eq('id', user.id).single()
                : Promise.resolve({ data: null }),
        ]);

        merchant.user_profiles = { avatar_url: profileResult.data?.avatar_url || null };
        if (ratingResult.data) merchant.rating = ratingResult.data;

        if (inventoryResult.error) console.error('Error fetching merchant inventory:', inventoryResult.error);
        mergedInventory = (inventoryResult.data || []).map(item => ({
            ...item,
            merchants: { business_name: merchant.business_name }
        }));

        return (
            <div className="min-h-screen">
                <Navbar />
                <main className="pt-20 md:pt-24">
                    <StorefrontV2Client
                        merchant={merchant}
                        initialInventory={mergedInventory}
                        customer={customerResult.data}
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
                    customer={customerProfile} 
                />
            </main>

            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
