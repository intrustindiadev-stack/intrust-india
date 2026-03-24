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

    // 2. Fetch Inventory Info (Merchant or Platform)
    // We'll check if there are any merchants selling this, or if it's a platform-direct item.
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

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar customer={customerProfile} />
            <main className="pt-24 pb-32">
                <ProductDetailClient 
                    product={product} 
                    inventory={inventory || []} 
                    customer={customerProfile} 
                />
            </main>
        </div>
    );
}
