-- Migration: Optimize Storefront DB Queries and RLS Policies
-- Created: 2026-06-07

-- 1. ADD MISSING INDEXES
-- Covering index on product_id to speed up inventory↔product joins
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_product_id 
ON public.merchant_inventory(product_id);

-- Composite index supporting storefront pagination (filters by merchant_id, is_active and orders by id)
CREATE INDEX IF NOT EXISTS idx_merchant_inventory_storefront_pagination
ON public.merchant_inventory(merchant_id, is_active, id);

-- Index for Official storefront query on platform_listed filtered to active/non-deleted products
CREATE INDEX IF NOT EXISTS idx_shopping_products_official_listed
ON public.shopping_products(platform_listed, id) 
WHERE (deleted_at IS NULL);


-- 2. RECREATE helper function to wrap auth.uid()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
  );
END;
$$;


-- 3. CONSOLIDATE RLS POLICIES & WRAP auth.uid() IN SUBQUERIES

-- merchant_inventory Policies
DROP POLICY IF EXISTS "Merchants delete own inventory" ON public.merchant_inventory;
CREATE POLICY "Merchants delete own inventory" ON public.merchant_inventory
    FOR DELETE TO authenticated
    USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Merchants insert own inventory" ON public.merchant_inventory;
CREATE POLICY "Merchants insert own inventory" ON public.merchant_inventory
    FOR INSERT TO authenticated
    WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Merchants update own inventory" ON public.merchant_inventory;
CREATE POLICY "Merchants update own inventory" ON public.merchant_inventory
    FOR UPDATE TO authenticated
    USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid())))
    WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Merchants view own inventory" ON public.merchant_inventory;
CREATE POLICY "Merchants view own inventory" ON public.merchant_inventory
    FOR SELECT TO authenticated
    USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid())));


-- shopping_products Policies
-- Drop duplicate public select policy
DROP POLICY IF EXISTS "Anyone can view products" ON public.shopping_products;

DROP POLICY IF EXISTS "Merchants can view own products" ON public.shopping_products;
CREATE POLICY "Merchants can view own products" ON public.shopping_products
    FOR SELECT TO authenticated
    USING ((is_active = true) OR (submitted_by_merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid()))));

DROP POLICY IF EXISTS "Merchants update own products" ON public.shopping_products;
CREATE POLICY "Merchants update own products" ON public.shopping_products
    FOR UPDATE TO authenticated
    USING (submitted_by_merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid())))
    WITH CHECK (submitted_by_merchant_id IN (SELECT id FROM public.merchants WHERE user_id = (SELECT auth.uid())));


-- 4. CREATE UNIFIED DEDICATED STOREFRONT PAGINATION RPC
CREATE OR REPLACE FUNCTION public.get_storefront_page(
    p_merchant_slug text,
    p_offset integer DEFAULT 0,
    p_limit integer DEFAULT 24,
    p_search text DEFAULT '',
    p_category text DEFAULT ''
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
BEGIN
    v_norm_slug := lower(p_merchant_slug);

    IF v_norm_slug = 'official' THEN
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
              AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
              AND (p_search = '' OR sp.title ILIKE '%' || p_search || '%')
            ORDER BY sp.id ASC
            LIMIT (p_limit + 1)
            OFFSET p_offset
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
            RETURN jsonb_build_object('error', 'Merchant not found or not approved', 'items', '[]'::jsonb, 'hasMore', false);
        END IF;

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
              AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
              AND (p_search = '' OR mi.custom_title ILIKE '%' || p_search || '%' OR sp.title ILIKE '%' || p_search || '%')
            ORDER BY mi.id ASC
            LIMIT (p_limit + 1)
            OFFSET p_offset
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
        'items', COALESCE(to_jsonb(v_results), '[]'::jsonb),
        'hasMore', v_has_more
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storefront_page(text, integer, integer, text, text) TO anon, authenticated, service_role;
