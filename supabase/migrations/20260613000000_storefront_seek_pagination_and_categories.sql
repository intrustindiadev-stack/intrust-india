-- Migration: Support Keyset/Seek Pagination and Optimized Category Query
-- Created: 2026-06-13

-- Drop the old storefront pagination function signature so we don't have overlapping overloads
DROP FUNCTION IF EXISTS public.get_storefront_page(text, integer, integer, text, text);

-- Create new storefront pagination function supporting seek pagination via p_last_id
CREATE OR REPLACE FUNCTION public.get_storefront_page(
    p_merchant_slug text,
    p_offset integer DEFAULT 0,
    p_limit integer DEFAULT 24,
    p_search text DEFAULT '',
    p_category text DEFAULT '',
    p_last_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    IF v_norm_slug = 'official' THEN
        -- Count total matching platform products
        SELECT COUNT(*) INTO v_total
        FROM public.shopping_products sp
        WHERE sp.platform_listed = true
          AND sp.deleted_at IS NULL
          AND sp.is_active = true
          AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
          AND (p_search = '' OR sp.title ILIKE '%' || p_search || '%');

        -- Fetch platform products
        FOR v_item IN 
            SELECT 
                sp.id,
                sp.title,
                sp.slug,
                sp.product_images,
                sp.category,
                sp.mrp_paise,
                sp.suggested_retail_price_paise,
                sp.platform_price_paise,
                sp.admin_stock,
                sp.platform_listed
            FROM public.shopping_products sp
            WHERE sp.platform_listed = true
              AND sp.deleted_at IS NULL
              AND sp.is_active = true
              AND (p_last_id IS NULL OR sp.id > p_last_id)
              AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
              AND (p_search = '' OR sp.title ILIKE '%' || p_search || '%')
            ORDER BY sp.id ASC
            LIMIT (p_limit + 1)
            OFFSET (CASE WHEN p_last_id IS NULL THEN p_offset ELSE 0 END)
        LOOP
            v_count := v_count + 1;
            IF v_count > p_limit THEN
                v_has_more := true;
            ELSE
                v_results := array_append(v_results, jsonb_build_object(
                    'id', 'platform-' || v_item.id,
                    'product_id', v_item.id,
                    'retail_price_paise', COALESCE(v_item.platform_price_paise, v_item.suggested_retail_price_paise),
                    'stock_quantity', v_item.admin_stock,
                    'merchant_id', NULL,
                    'is_active', true,
                    'is_platform_direct', true,
                    'is_platform_product', true,
                    'shopping_products', jsonb_build_object(
                        'id', v_item.id,
                        'title', v_item.title,
                        'slug', v_item.slug,
                        'product_images', v_item.product_images,
                        'category', v_item.category,
                        'mrp_paise', v_item.mrp_paise,
                        'suggested_retail_price_paise', v_item.suggested_retail_price_paise,
                        'platform_price_paise', v_item.platform_price_paise,
                        'admin_stock', v_item.admin_stock,
                        'platform_listed', v_item.platform_listed
                    )
                ));
            END IF;
        END LOOP;
        
    ELSE
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
          AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
          AND (p_search = '' OR mi.custom_title ILIKE '%' || p_search || '%' OR sp.title ILIKE '%' || p_search || '%');

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
                sp.mrp_paise,
                sp.suggested_retail_price_paise
            FROM public.merchant_inventory mi
            JOIN public.shopping_products sp ON mi.product_id = sp.id
            WHERE mi.merchant_id = v_merchant_id
              AND mi.is_active = true
              AND sp.deleted_at IS NULL
              AND (p_last_id IS NULL OR mi.id > p_last_id)
              AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
              AND (p_search = '' OR mi.custom_title ILIKE '%' || p_search || '%' OR sp.title ILIKE '%' || p_search || '%')
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
                        'mrp_paise', v_item.mrp_paise,
                        'suggested_retail_price_paise', v_item.suggested_retail_price_paise
                    ),
                    'merchants', jsonb_build_object(
                        'business_name', v_business_name
                    )
                ));
            END IF;
        END LOOP;

    END IF;

    RETURN jsonb_build_object(
        'items',      COALESCE(to_jsonb(v_results), '[]'::jsonb),
        'hasMore',    v_has_more,
        'totalCount', v_total
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storefront_page(text, integer, integer, text, text, uuid) TO anon, authenticated, service_role;


-- Create dedicated categories query function
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
    IF v_norm_slug = 'official' THEN
        SELECT array_agg(DISTINCT category) INTO v_categories
        FROM public.shopping_products
        WHERE platform_listed = true
          AND deleted_at IS NULL
          AND is_active = true
          AND category IS NOT NULL;
    ELSE
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
    END IF;
    RETURN COALESCE(v_categories, '{}'::text[]);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_merchant_categories(text) TO anon, authenticated, service_role;
