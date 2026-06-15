import { createStaticSupabaseClient, createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";
import Navbar from "@/components/layout/Navbar";

// UUID pattern to detect legacy ID-based URLs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export default async function ProductDetailPage({ params }) {
    const { productSlug } = await params;

    // Use admin client to bypass RLS for product/inventory lookups.
    // The storefront uses SECURITY DEFINER RPCs that bypass RLS — so products
    // visible there may not be readable via the anon key's RLS policy directly.
    // Admin client is safe here: this is a Server Component, the key never reaches the browser.
    const supabase = createAdminClient();
    // Static client for non-sensitive public queries (platform settings, recommendations)
    const staticSupabase = createStaticSupabaseClient();


    // If the segment looks like a UUID, redirect to the slug-based URL
    if (UUID_REGEX.test(productSlug)) {
        const { data: legacyProduct } = await supabase
            .from('shopping_products')
            .select('slug')
            .eq('id', productSlug)
            .is('deleted_at', null)
            .maybeSingle();

        if (legacyProduct?.slug) {
            redirect(`/shop/product/${legacyProduct.slug}`);
        }
        redirect('/shop');
    }

    // 1. Fetch Product Details by slug
    // Use maybeSingle() instead of single() — returns null (not an error) when no row found
    const { data: product, error: productError } = await supabase
        .from('shopping_products')
        .select(`
            id, title, description, product_images, mrp_paise,
            suggested_retail_price_paise, platform_price_paise, platform_listed,
            category_id, category, slug,
            is_active, admin_stock, gst_percentage, hsn_code, approval_status, created_at,
            shopping_categories(name, color_primary, color_secondary)
        `)
        .eq('slug', productSlug)
        .is('deleted_at', null)
        .maybeSingle();

    if (productError) {
        console.error("[PDP] Error fetching product:", productError?.message || productError?.code || JSON.stringify(productError));
        redirect("/shop");
    }

    if (!product) {
        console.warn("[PDP] Product not found for slug:", productSlug);
        redirect("/shop");
    }

    // Block access to pending-approval products on the public storefront.
    // Products with approval_status = null are legacy admin/platform products — allow those.
    if (product.approval_status && product.approval_status !== 'live') {
        redirect('/shop');
    }

    // Run independent queries in parallel for performance
    const [
        inventoryResult,
        platformSettingsResult,
    ] = await Promise.all([
        // 2. Fetch Inventory Info
        supabase
            .from('merchant_inventory')
            .select(`
                *,
                merchants(id, business_name, business_address, is_open)
            `)
            .eq('product_id', product.id)
            .limit(5),

        // 3. Fetch Platform Store status (public, no admin needed)
        staticSupabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'platform_store')
            .maybeSingle(),
    ]);

    const inventory = inventoryResult.data || [];

    let platformStatus = { is_open: true };
    if (platformSettingsResult.data?.value) {
        try { platformStatus = JSON.parse(platformSettingsResult.data.value); } catch (e) { }
    }

    // 4. Get current customer (uses session-aware client — only for auth, never for public data)
    let customerProfile = null;
    try {
        const authSupabase = await createServerSupabaseClient();
        const { data: { user } } = await authSupabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            customerProfile = profile;
        }
    } catch (authErr) {
        // Auth check is non-critical for a public product page — continue without profile
        console.warn("[PDP] Auth check failed, continuing as guest:", authErr?.message);
    }

    // 5. Fetch recommended products from same category (exclude current product)
    let recommendedProducts = [];
    // Only attempt if product has a valid category — prevents .ilike() crash on null
    if (product.category) {
        try {
            const [recInventoryResult, recPlatformResult] = await Promise.all([
                staticSupabase
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
                    .limit(8),

                staticSupabase
                    .from('shopping_products')
                    .select(`
                        id, slug, title, description, product_images, category,
                        mrp_paise, suggested_retail_price_paise, platform_listed, platform_price_paise
                    `)
                    .eq('platform_listed', true)
                    .or('approval_status.eq.live,approval_status.is.null')
                    .gt('admin_stock', 0)
                    .is('deleted_at', null)
                    .ilike('category', product.category)
                    .neq('id', product.id)
                    .limit(8),
            ]);

            const recInventory = recInventoryResult.data || [];
            const recPlatform = recPlatformResult.data || [];

            const platformMapped = recPlatform.map(p => ({
                id: `platform-${p.id}`,
                product_id: p.id,
                retail_price_paise: p.platform_price_paise ?? p.suggested_retail_price_paise,
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
                    platform_price_paise: p.platform_price_paise,
                },
            }));

            recommendedProducts = [...platformMapped, ...recInventory].slice(0, 10);
        } catch (recErr) {
            console.warn('[PDP] Failed to fetch recommended products:', recErr?.message);
            recommendedProducts = [];
        }
    }

    return (
        <div className="min-h-screen">
            <Navbar customer={customerProfile} />
            <main>
                <ProductDetailClient
                    product={product}
                    inventory={inventory}
                    customer={customerProfile}
                    recommendedProducts={recommendedProducts}
                    initialPlatformStatus={platformStatus}
                />
            </main>
        </div>
    );
}
