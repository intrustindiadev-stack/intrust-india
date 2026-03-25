import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import Navbar from "@/components/layout/Navbar";

export default async function ProductDetailPage({ params }) {
    const { productId } = await params;
    const supabase = await createServerSupabaseClient();

    // 1. Fetch Product Details
    const { data: product, error: productError } = await supabase
        .from('shopping_products')
        .select(`
            *,
            shopping_categories(name, color_primary, color_secondary)
        `)
        .eq('id', productId)
        .single();

    if (productError || !product) {
        console.error("Product not found:", productError);
        redirect("/shop");
    }

    // 2. Fetch Inventory Info
    const { data: inventory } = await supabase
        .from('merchant_inventory')
        .select(`
            *,
            merchants(business_name, business_address)
        `)
        .eq('product_id', productId)
        .eq('is_active', true)
        .limit(5);

    // 3. Get current customer
    const { data: { user } } = await supabase.auth.getUser();
    let customerProfile = null;
    if (user) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        customerProfile = profile;
    }

    // 4. Fetch recommended products from same category (exclude current product)
    let recommendedProducts = [];
    if (product.category) {
        const { data: recInventory } = await supabase
            .from('merchant_inventory')
            .select(`
                id,
                retail_price_paise,
                stock_quantity,
                product_id,
                is_active,
                merchants (business_name),
                shopping_products!inner (id, title, image_url, category, suggested_retail_price_paise, mrp_paise)
            `)
            .eq('is_active', true)
            .gt('stock_quantity', 0)
            .ilike('shopping_products.category', product.category)
            .neq('product_id', productId)
            .limit(8);

        const { data: recPlatform } = await supabase
            .from('shopping_products')
            .select('*')
            .eq('is_active', true)
            .gt('admin_stock', 0)
            .ilike('category', product.category)
            .neq('id', productId)
            .limit(8);

        const platformMapped = (recPlatform || []).map(p => ({
            id: `platform-${p.id}`,
            product_id: p.id,
            retail_price_paise: p.suggested_retail_price_paise,
            stock_quantity: p.admin_stock,
            is_platform_direct: true,
            merchants: { business_name: 'InTrust Official' },
            shopping_products: p
        }));

        recommendedProducts = [...platformMapped, ...(recInventory || [])].slice(0, 10);
    }

    return (
        <div className="min-h-screen">
            <Navbar customer={customerProfile} />
            <main>
                <ProductDetailClient 
                    product={product} 
                    inventory={inventory || []} 
                    customer={customerProfile}
                    recommendedProducts={recommendedProducts}
                />
            </main>
        </div>
    );
}
