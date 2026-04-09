import { createServerSupabaseClient } from '@/lib/supabaseServer';
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

    if (merchantSlug === 'official') {
        merchant = {
            id: 'official',
            slug: 'official',
            business_name: 'Intrust Official',
            user_profiles: { avatar_url: '/icons/intrustLogo.png' }
        };

        const { data: platformProducts, error: platformError } = await supabase
            .from('shopping_products')
            .select('*')
            .eq('is_active', true)
            .gt('admin_stock', 0);

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
                business_name,
                user_profiles!left (avatar_url)
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

        const { data: inventory, error: inventoryError } = await supabase
            .from('merchant_inventory')
            .select(`
                id,
                retail_price_paise,
                stock_quantity,
                merchant_id,
                product_id,
                is_active,
                custom_title,
                custom_description,
                shopping_products!inner (id, slug, title, description, product_images, category, mrp_paise, suggested_retail_price_paise)
            `)
            .eq('merchant_id', merchant.id)
            .eq('is_active', true)
            .gt('stock_quantity', 0);

        if (inventoryError) console.error('Error fetching merchant inventory:', inventoryError);

        mergedInventory = (inventory || []).map(item => ({
            ...item,
            merchants: { business_name: merchant.business_name }
        }));
    }

    // Get customer profile for wallet balance & sync
    let customerProfile = null;
    if (user) {
        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        customerProfile = data;
    }

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
