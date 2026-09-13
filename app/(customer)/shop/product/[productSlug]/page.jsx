import { createStaticSupabaseClient, createServerSupabaseClient, createAdminClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";

// UUID pattern to detect legacy ID-based URLs
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export default async function ProductDetailPage({ params }) {
    const { productSlug } = await params;

    // Use admin client to bypass RLS for product/inventory lookups.
    const supabase = createAdminClient();
    const staticSupabase = createStaticSupabaseClient();

    // 1. Decode & normalize incoming slug parameter
    const rawParam = (productSlug || '').trim();
    let decodedSlug = rawParam;
    try {
        decodedSlug = decodeURIComponent(rawParam).trim();
    } catch (e) {
        decodedSlug = rawParam;
    }

    let product = null;

    const PRODUCT_SELECT_FIELDS = `
        id, title, description, product_images, mrp_paise,
        suggested_retail_price_paise, platform_price_paise, platform_listed,
        category_id, category, sub_category, slug,
        is_active, admin_stock, gst_percentage, hsn_code, approval_status, created_at,
        shopping_categories(name, color_primary, color_secondary),
        fashion_product_categories(category_id)
    `;

    // Strategy A: If it's a UUID, check product ID or merchant inventory ID
    if (UUID_REGEX.test(decodedSlug)) {
        const { data: byId } = await supabase
            .from('shopping_products')
            .select(PRODUCT_SELECT_FIELDS)
            .eq('id', decodedSlug)
            .is('deleted_at', null)
            .maybeSingle();

        if (byId) {
            product = byId;
            if (byId.slug && byId.slug !== decodedSlug) {
                redirect(`/shop/product/${byId.slug}`);
            }
        } else {
            // Check if it is a merchant_inventory ID
            const { data: inv } = await supabase
                .from('merchant_inventory')
                .select('product_id, shopping_products(slug, id)')
                .eq('id', decodedSlug)
                .maybeSingle();

            if (inv?.shopping_products?.slug) {
                redirect(`/shop/product/${inv.shopping_products.slug}`);
            } else if (inv?.product_id) {
                const { data: byInvProdId } = await supabase
                    .from('shopping_products')
                    .select(PRODUCT_SELECT_FIELDS)
                    .eq('id', inv.product_id)
                    .is('deleted_at', null)
                    .maybeSingle();
                product = byInvProdId;
            }
        }
    }

    // Strategy B: If not found by UUID, resolve by slug or title
    if (!product) {
        // B1. Exact slug match
        const { data: exactSlug } = await supabase
            .from('shopping_products')
            .select(PRODUCT_SELECT_FIELDS)
            .eq('slug', decodedSlug)
            .is('deleted_at', null)
            .maybeSingle();
        product = exactSlug;

        // B2. Case-insensitive slug match
        if (!product) {
            const { data: ilikeSlug } = await supabase
                .from('shopping_products')
                .select(PRODUCT_SELECT_FIELDS)
                .ilike('slug', decodedSlug)
                .is('deleted_at', null)
                .maybeSingle();
            product = ilikeSlug;
        }

        // B3. Hyphenated / lowercase slug variations
        if (!product) {
            const hyphenated = decodedSlug.toLowerCase().replace(/\s+/g, '-');
            const { data: hyphenSlug } = await supabase
                .from('shopping_products')
                .select(PRODUCT_SELECT_FIELDS)
                .or(`slug.ilike.${hyphenated},slug.ilike.${decodedSlug.toLowerCase()}`)
                .is('deleted_at', null)
                .maybeSingle();
            product = hyphenSlug;
        }

        // B4. Title fallback match
        if (!product) {
            const titleSearch = decodedSlug.replace(/-/g, ' ');
            const { data: titleMatch } = await supabase
                .from('shopping_products')
                .select(PRODUCT_SELECT_FIELDS)
                .ilike('title', titleSearch)
                .is('deleted_at', null)
                .limit(1)
                .maybeSingle();
            product = titleMatch;
        }

        // B5. Check merchant inventory by custom_title
        if (!product) {
            const { data: invMatch } = await supabase
                .from('merchant_inventory')
                .select('product_id')
                .ilike('custom_title', decodedSlug.replace(/-/g, ' '))
                .limit(1)
                .maybeSingle();

            if (invMatch?.product_id) {
                const { data: byInvCustomTitle } = await supabase
                    .from('shopping_products')
                    .select(PRODUCT_SELECT_FIELDS)
                    .eq('id', invMatch.product_id)
                    .is('deleted_at', null)
                    .maybeSingle();
                product = byInvCustomTitle;
            }
        }
    }

    if (!product) {
        console.warn("[PDP] Product not found for slug/id:", productSlug, decodedSlug);
        redirect("/shop");
    }

    // Guard: Block access only to explicit drafts, pending approval, or rejected products that are inactive.
    // Platform and active merchant products with 'live', 'approved', 'active', or null status are allowed.
    if (product.approval_status) {
        const normStatus = product.approval_status.toLowerCase();
        if (['draft', 'rejected', 'pending_approval'].includes(normStatus) && !product.is_active) {
            redirect('/shop');
        }
    }

    // Run independent queries in parallel for performance
    const [
        inventoryResult,
        platformSettingsResult,
        variantsResult
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

        // 4. Fetch Fashion Variants
        supabase
            .from('fashion_variants')
            .select(`
                id,
                sku,
                size,
                color,
                fit,
                fabric,
                price_paise,
                compare_at_price_paise,
                inventory_quantity,
                is_active,
                fashion_variant_media (
                    image_url,
                    is_primary
                )
            `)
            .eq('product_id', product.id)
            .eq('is_active', true)
            .order('id', { ascending: true }),
    ]);

    const inventory = inventoryResult.data || [];
    const variants = variantsResult.data || [];

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
        <div className="w-full">
            <main>
                <ProductDetailClient
                    product={product}
                    inventory={inventory}
                    variants={variants}
                    customer={customerProfile}
                    recommendedProducts={recommendedProducts}
                    initialPlatformStatus={platformStatus}
                />
            </main>
        </div>
    );
}
