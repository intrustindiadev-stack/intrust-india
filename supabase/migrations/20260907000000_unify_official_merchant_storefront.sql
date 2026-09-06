-- ============================================================
-- 20260907000000_unify_official_merchant_storefront.sql
-- ============================================================
-- Architecture correction:
-- 1. InTrust Official uses the exact same merchant record and storefront model.
-- 2. Update InTrust Official merchant record: business_name = 'InTrust Official',
--    subscription_status = 'active', status = 'approved', is_open = true.
-- 3. Mark test and duplicate merchant records as suspended so they are excluded
--    from customer-facing visibility.
-- 4. Unify get_storefront_page RPC and get_merchant_categories so 'official'
--    resolves canonically to 'intrust-mart' and queries merchant_inventory.
-- ============================================================

BEGIN;

-- Enable internal bypass for migration execution
SET LOCAL app.internal_bypass = 'true';

-- 1. Ensure InTrust Official record is active, approved, and properly named
UPDATE public.merchants
SET business_name = 'InTrust Official',
    subscription_status = 'active',
    subscription_expires_at = '2099-12-31 23:59:59+00',
    status = 'approved',
    is_open = true
WHERE id = 'aa1d570b-1f38-4b4c-b1e0-59f009f28959';

-- 2. Mark test and duplicate merchant records as suspended
UPDATE public.merchants
SET status = 'suspended',
    suspension_reason = 'E2E test / duplicate merchant excluded from customer shop'
WHERE id IN (
    'de99475d-f202-47b6-b12a-b3e9e5c5c6ae', -- test-merchant-llc
    '66666678-5ac0-48d0-a09e-08e3351769c3', -- test-merchant-llc-2
    'edd5d0dc-0d51-47c8-bc66-13bed3e1f0ae'  -- duplicate/empty merchant-intrust
);

-- 3. Update get_storefront_page RPC to eliminate duplicate official catalog architecture
CREATE OR REPLACE FUNCTION public.get_storefront_page(
    p_merchant_slug text, 
    p_offset integer DEFAULT 0, 
    p_limit integer DEFAULT 24, 
    p_search text DEFAULT ''::text, 
    p_category text DEFAULT ''::text, 
    p_last_id uuid DEFAULT NULL::uuid,
    p_price_min integer DEFAULT NULL,
    p_price_max integer DEFAULT NULL,
    p_brand text DEFAULT ''::text,
    p_size text DEFAULT ''::text,
    p_color text DEFAULT ''::text,
    p_sub_category text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 DECLARE
     v_merchant_id uuid;
     v_business_name text;
     v_results jsonb[] := '{}'::jsonb[];
     v_item RECORD;
     v_has_more boolean := false;
     v_count integer := 0;
     v_norm_slug text;
     v_total integer := 0;
 BEGIN
     v_norm_slug := lower(p_merchant_slug);

     -- Canonical alias: official and legacy intrust-mart resolve to intrust-official
     IF v_norm_slug IN ('official', 'intrust-mart') THEN
         v_norm_slug := 'intrust-official';
     END IF;

     -- Fetch merchant
     SELECT id, business_name INTO v_merchant_id, v_business_name
     FROM public.merchants
     WHERE lower(slug) = v_norm_slug
       AND status = 'approved';

     IF NOT FOUND THEN
         RETURN jsonb_build_object('error', 'Merchant not found or not approved', 'items', '[]'::jsonb, 'hasMore', false, 'totalCount', 0);
     END IF;

     -- Count total matching merchant inventory rows
     SELECT COUNT(*) INTO v_total
     FROM public.merchant_inventory mi
     JOIN public.shopping_products sp ON mi.product_id = sp.id
     WHERE mi.merchant_id = v_merchant_id
       AND mi.is_active = true
       AND sp.deleted_at IS NULL
       AND (COALESCE(p_category, '') = '' OR p_category = 'All' OR sp.category = p_category)
       AND (COALESCE(p_sub_category, '') = '' OR sp.sub_category = p_sub_category)
       AND (COALESCE(p_search, '') = '' OR mi.custom_title ILIKE '%' || p_search || '%' OR sp.title ILIKE '%' || p_search || '%')
       AND (COALESCE(p_brand, '') = '' OR mi.custom_title ILIKE '%' || p_brand || '%' OR sp.title ILIKE '%' || p_brand || '%')
       AND (p_price_min IS NULL OR mi.retail_price_paise >= p_price_min)
       AND (p_price_max IS NULL OR mi.retail_price_paise <= p_price_max)
       AND (COALESCE(p_size, '') = '' OR EXISTS (
           SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.size = p_size AND fv.is_active = true
       ))
       AND (COALESCE(p_color, '') = '' OR EXISTS (
           SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.color = p_color AND fv.is_active = true
       ));

     -- Fetch merchant inventory
     FOR v_item IN
         SELECT
             mi.id AS inventory_id,
             mi.retail_price_paise,
             mi.stock_quantity,
             mi.merchant_id,
             mi.product_id,
             mi.is_active,
             mi.is_platform_product,
             mi.custom_title,
             mi.custom_description,
             sp.id AS product_id_sp,
             sp.title AS product_title,
             sp.slug AS product_slug,
             sp.product_images,
             sp.category,
             sp.sub_category,
             sp.mrp_paise,
             sp.suggested_retail_price_paise
         FROM public.merchant_inventory mi
         JOIN public.shopping_products sp ON mi.product_id = sp.id
         WHERE mi.merchant_id = v_merchant_id
           AND mi.is_active = true
           AND sp.deleted_at IS NULL
           AND (p_last_id IS NULL OR mi.id > p_last_id)
           AND (COALESCE(p_category, '') = '' OR p_category = 'All' OR sp.category = p_category)
           AND (COALESCE(p_sub_category, '') = '' OR sp.sub_category = p_sub_category)
           AND (COALESCE(p_search, '') = '' OR mi.custom_title ILIKE '%' || p_search || '%' OR sp.title ILIKE '%' || p_search || '%')
           AND (COALESCE(p_brand, '') = '' OR mi.custom_title ILIKE '%' || p_brand || '%' OR sp.title ILIKE '%' || p_brand || '%')
           AND (p_price_min IS NULL OR mi.retail_price_paise >= p_price_min)
           AND (p_price_max IS NULL OR mi.retail_price_paise <= p_price_max)
           AND (COALESCE(p_size, '') = '' OR EXISTS (
               SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.size = p_size AND fv.is_active = true
           ))
           AND (COALESCE(p_color, '') = '' OR EXISTS (
               SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.color = p_color AND fv.is_active = true
           ))
         ORDER BY mi.id ASC
         LIMIT (p_limit + 1)
         OFFSET (CASE WHEN p_last_id IS NULL THEN p_offset ELSE 0 END)
     LOOP
         v_count := v_count + 1;
         IF v_count > p_limit THEN
             v_has_more := true;
         ELSE
             v_results := array_append(v_results, jsonb_build_object(
                 'id', v_item.inventory_id,
                 'retail_price_paise', v_item.retail_price_paise,
                 'stock_quantity', v_item.stock_quantity,
                 'merchant_id', v_item.merchant_id,
                 'product_id', v_item.product_id,
                 'is_active', v_item.is_active,
                 'is_platform_product', v_item.is_platform_product,
                 'custom_title', v_item.custom_title,
                 'custom_description', v_item.custom_description,
                 'shopping_products', jsonb_build_object(
                     'id', v_item.product_id_sp,
                     'title', v_item.product_title,
                     'slug', v_item.product_slug,
                     'product_images', v_item.product_images,
                     'category', v_item.category,
                     'sub_category', v_item.sub_category,
                     'mrp_paise', v_item.mrp_paise,
                     'suggested_retail_price_paise', v_item.suggested_retail_price_paise
                 ),
                 'merchants', jsonb_build_object(
                     'business_name', v_business_name
                 )
             ));
         END IF;
     END LOOP;

     RETURN jsonb_build_object(
         'items',      COALESCE(to_jsonb(v_results), '[]'::jsonb),
         'hasMore',    v_has_more,
         'totalCount', v_total
     );
 END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_storefront_page(text, integer, integer, text, text, uuid, integer, integer, text, text, text, text) TO anon, authenticated, service_role;

-- 4. Update get_merchant_categories RPC
CREATE OR REPLACE FUNCTION public.get_merchant_categories(p_merchant_slug text)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_merchant_id uuid;
    v_categories text[];
    v_norm_slug text;
BEGIN
    v_norm_slug := lower(p_merchant_slug);
    IF v_norm_slug IN ('official', 'intrust-mart') THEN
        v_norm_slug := 'intrust-official';
    END IF;

    SELECT id INTO v_merchant_id
    FROM public.merchants
    WHERE lower(slug) = v_norm_slug
      AND status = 'approved';

    IF FOUND THEN
        SELECT array_agg(DISTINCT sp.category) INTO v_categories
        FROM public.merchant_inventory mi
        JOIN public.shopping_products sp ON mi.product_id = sp.id
        WHERE mi.merchant_id = v_merchant_id
          AND mi.is_active = true
          AND sp.deleted_at IS NULL
          AND sp.category IS NOT NULL;
    END IF;
    RETURN COALESCE(v_categories, '{}'::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_merchant_categories(text) TO anon, authenticated, service_role;

COMMIT;
