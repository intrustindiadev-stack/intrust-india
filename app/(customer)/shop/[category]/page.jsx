import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { notFound, redirect } from 'next/navigation';
import StorefrontV2Client from './StorefrontV2Client';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

export const dynamic = 'force-dynamic';

export default async function CategoryStorefrontPage({ params }) {
    const { category } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch products belonging to this category from merchant inventory
    // Category check is case-insensitive for better UX
    // Fetch BOTH platform products and merchant inventory
    const [inventoryRes, platformRes] = await Promise.all([
        supabase
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
                merchants (business_name),
                shopping_products!inner (id, title, description, image_url, category, mrp_paise, suggested_retail_price_paise)
            `)
            .eq('is_active', true)
            .gt('stock_quantity', 0)
            .ilike('shopping_products.category', category),
        supabase
            .from('shopping_products')
            .select('*')
            .eq('is_active', true)
            .gt('admin_stock', 0)
            .ilike('category', category)
    ]);

    // Fetch category metadata for styling
    const { data: categoryData } = await supabase
        .from('shopping_categories')
        .select('*')
        .ilike('name', category)
        .single();

    const inventory = inventoryRes.data || [];
    const platformProducts = (platformRes.data || []).map(p => ({
        id: `platform-${p.id}`,
        product_id: p.id,
        retail_price_paise: p.suggested_retail_price_paise,
        stock_quantity: p.admin_stock,
        merchant_id: null, // Admin
        is_active: true,
        is_platform_direct: true,
        merchants: { business_name: 'InTrust Official', rating: 5.0 },
        shopping_products: p
    }));

    const combinedInventory = [...platformProducts, ...inventory];

    if (inventoryRes.error) console.error('Error fetching inventory:', inventoryRes.error);
    if (platformRes.error) console.error('Error fetching platform products:', platformRes.error);

    // Get customer profile for wallet balance
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
                    category={category}
                    categoryMetadata={categoryData}
                    initialInventory={combinedInventory} 
                    customer={customerProfile} 
                />
            </main>

            <Footer />
            <CustomerBottomNav />
        </div>
    );
}
