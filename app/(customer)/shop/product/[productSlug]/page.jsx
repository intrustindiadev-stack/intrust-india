import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import Navbar from "@/components/layout/Navbar";

// UUID pattern to detect legacy ID-based URLs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export default async function ProductDetailPage({ params }) {
    const { productSlug } = await params;
    const supabase = await createServerSupabaseClient();

    // If the segment looks like a UUID, redirect to the slug-based URL
    if (UUID_REGEX.test(productSlug)) {
        const { data: legacyProduct } = await supabase
            .from('shopping_products')
            .select('slug')
            .eq('id', productSlug)
            .is('deleted_at', null)
            .single();

        if (legacyProduct?.slug) {
            redirect(`/shop/product/${legacyProduct.slug}`);
        }
        redirect('/shop');
    }

    // 1. Fetch Product Details by slug
    const { data: product, error: productError } = await supabase
        .from('shopping_products')
        .select(`
            id, title, description, product_images, mrp_paise,
            suggested_retail_price_paise, category_id, category, slug,
            is_active, gst_percentage, hsn_code, approval_status, created_at,
            shopping_categories(name, color_primary, color_secondary)
        `)
        .eq('slug', productSlug)
        .is('deleted_at', null)
        .single();

    if (productError || !product) {
        console.error("Product not found:", productError);
        redirect("/shop");
    }

    // 2. Fetch Inventory Info (use product.id for relational queries)
    const { data: inventory } = await supabase
        .from('merchant_inventory')
        .select(`
            *,
            merchants(id, business_name, business_address, is_open)
        `)
        .eq('product_id', product.id)
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

    // 4. Fetch Platform Store status
    const { data: platformSettings } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'platform_store')
        .single();

    let platformStatus = { is_open: true };
    if (platformSettings?.value) {
        try { platformStatus = JSON.parse(platformSettings.value); } catch (e) { }
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
                shopping_products!inner (id, slug, title, product_images, category, suggested_retail_price_paise, mrp_paise)
            `)
            .eq('is_active', true)
            .gt('stock_quantity', 0)
            .ilike('shopping_products.category', product.category)
            .neq('product_id', product.id)
            .limit(8);

        const { data: recPlatform } = await supabase
            .from('shopping_products')
            .select(`
                id, slug, title, description, product_images, category,
                mrp_paise, suggested_retail_price_paise, is_active
            `)
            .eq('is_active', true)
            .gt('admin_stock', 0)
            .is('deleted_at', null)
            .ilike('category', product.category)
            .neq('id', product.id)
            .limit(8);

        const platformMapped = (recPlatform || []).map(p => ({
            id: `platform-${p.id}`,
            product_id: p.id,
            retail_price_paise: p.suggested_retail_price_paise,
            // Use a sentinel value (1) to signal in-stock without leaking the real count
            stock_quantity: 1,
            is_platform_direct: true,
            merchants: { business_name: 'InTrust Official' },
            shopping_products: {
                id: p.id,
                slug: p.slug,
                title: p.title,
                description: p.description,
                product_images: p.product_images,
                category: p.category,
                mrp_paise: p.mrp_paise,
                suggested_retail_price_paise: p.suggested_retail_price_paise,
                is_active: p.is_active,
            },
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
                    platformStatus={platformStatus}
                />
            </main>
        </div>
    );
}
