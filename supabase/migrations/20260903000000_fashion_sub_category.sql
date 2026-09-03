BEGIN;

-- 1. Alter table
ALTER TABLE public.shopping_products ADD COLUMN IF NOT EXISTS sub_category text;
CREATE INDEX IF NOT EXISTS idx_shopping_products_sub_category ON public.shopping_products(sub_category);

-- 2. Update get_storefront_page (from 20260902000000_storefront_advanced_filters.sql)
DROP FUNCTION IF EXISTS public.get_storefront_page(text, integer, integer, text, text, uuid, integer, integer, text, text, text);

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

     IF v_norm_slug = 'official' THEN
         -- Count total matching platform products
         SELECT COUNT(*) INTO v_total
         FROM public.shopping_products sp
         WHERE sp.platform_listed = true
           AND sp.deleted_at IS NULL
           AND sp.is_active = true
           AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
           AND (p_sub_category IS NULL OR p_sub_category = '' OR sp.sub_category = p_sub_category)
           AND (p_search = '' OR sp.title ILIKE '%' || p_search || '%')
           AND (p_brand = '' OR sp.title ILIKE '%' || p_brand || '%')
           AND (p_price_min IS NULL OR sp.platform_price_paise >= p_price_min OR (sp.platform_price_paise IS NULL AND sp.suggested_retail_price_paise >= p_price_min))
           AND (p_price_max IS NULL OR sp.platform_price_paise <= p_price_max OR (sp.platform_price_paise IS NULL AND sp.suggested_retail_price_paise <= p_price_max))
           AND (p_size = '' OR EXISTS (
               SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.size = p_size AND fv.is_active = true
           ))
           AND (p_color = '' OR EXISTS (
               SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.color = p_color AND fv.is_active = true
           ));

         -- Fetch platform products
         FOR v_item IN
             SELECT
                 sp.id,
                 sp.title,
                 sp.slug,
                 sp.product_images,
                 sp.category,
                 sp.sub_category,
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
               AND (p_sub_category IS NULL OR p_sub_category = '' OR sp.sub_category = p_sub_category)
               AND (p_search = '' OR sp.title ILIKE '%' || p_search || '%')
               AND (p_brand = '' OR sp.title ILIKE '%' || p_brand || '%')
               AND (p_price_min IS NULL OR sp.platform_price_paise >= p_price_min OR (sp.platform_price_paise IS NULL AND sp.suggested_retail_price_paise >= p_price_min))
               AND (p_price_max IS NULL OR sp.platform_price_paise <= p_price_max OR (sp.platform_price_paise IS NULL AND sp.suggested_retail_price_paise <= p_price_max))
               AND (p_size = '' OR EXISTS (
                   SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.size = p_size AND fv.is_active = true
               ))
               AND (p_color = '' OR EXISTS (
                   SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.color = p_color AND fv.is_active = true
               ))
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
                         'sub_category', v_item.sub_category,
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
           AND (p_sub_category IS NULL OR p_sub_category = '' OR sp.sub_category = p_sub_category)
           AND (p_search = '' OR mi.custom_title ILIKE '%' || p_search || '%' OR sp.title ILIKE '%' || p_search || '%')
           AND (p_brand = '' OR mi.custom_title ILIKE '%' || p_brand || '%' OR sp.title ILIKE '%' || p_brand || '%')
           AND (p_price_min IS NULL OR mi.retail_price_paise >= p_price_min)
           AND (p_price_max IS NULL OR mi.retail_price_paise <= p_price_max)
           AND (p_size = '' OR EXISTS (
               SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.size = p_size AND fv.is_active = true
           ))
           AND (p_color = '' OR EXISTS (
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
               AND (p_category = '' OR p_category = 'All' OR sp.category = p_category)
               AND (p_sub_category IS NULL OR p_sub_category = '' OR sp.sub_category = p_sub_category)
               AND (p_search = '' OR mi.custom_title ILIKE '%' || p_search || '%' OR sp.title ILIKE '%' || p_search || '%')
               AND (p_brand = '' OR mi.custom_title ILIKE '%' || p_brand || '%' OR sp.title ILIKE '%' || p_brand || '%')
               AND (p_price_min IS NULL OR mi.retail_price_paise >= p_price_min)
               AND (p_price_max IS NULL OR mi.retail_price_paise <= p_price_max)
               AND (p_size = '' OR EXISTS (
                   SELECT 1 FROM public.fashion_variants fv WHERE fv.product_id = sp.id AND fv.size = p_size AND fv.is_active = true
               ))
               AND (p_color = '' OR EXISTS (
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

     END IF;

     RETURN jsonb_build_object(
         'items',      COALESCE(to_jsonb(v_results), '[]'::jsonb),
         'hasMore',    v_has_more,
         'totalCount', v_total
     );
 END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_storefront_page(text, integer, integer, text, text, uuid, integer, integer, text, text, text, text) TO anon, authenticated, service_role;


-- 3. Update admin_insert_shopping_product and admin_update_shopping_product
DROP FUNCTION IF EXISTS public.admin_insert_shopping_product(text,text,text,uuid,bigint,bigint,bigint,integer,text[],boolean,boolean,integer,text);
DROP FUNCTION IF EXISTS public.admin_update_shopping_product(uuid,text,text,text,uuid,bigint,bigint,bigint,integer,text[],boolean,boolean,integer,text);

CREATE OR REPLACE FUNCTION public.admin_insert_shopping_product(
    p_title text,
    p_description text,
    p_category text,
    p_category_id uuid,
    p_wholesale_price bigint,
    p_retail_price bigint,
    p_mrp_paise bigint DEFAULT 0,
    p_admin_stock integer DEFAULT 0,
    p_product_images text[] DEFAULT '{}'::text[],
    p_is_active boolean DEFAULT true,
    p_platform_listed boolean DEFAULT true,
    p_gst_percentage integer DEFAULT 0,
    p_hsn_code text DEFAULT '9971'::text,
    p_sub_category text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role text;
    v_product_id uuid;
BEGIN
    v_admin_role := auth.jwt() ->> 'role';
    
    IF v_admin_role IS NULL THEN
        SELECT role INTO v_admin_role
        FROM public.user_profiles
        WHERE id = auth.uid();

        IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin', 'super_admin') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin or Super Admin role required');
        END IF;
    END IF;

    INSERT INTO public.shopping_products (
        title, description, category, category_id, wholesale_price_paise, suggested_retail_price_paise,
        mrp_paise, admin_stock, product_images, is_active, platform_listed, gst_percentage, hsn_code, sub_category
    ) VALUES (
        p_title, p_description, p_category, p_category_id, p_wholesale_price, p_retail_price,
        p_mrp_paise, p_admin_stock, p_product_images, p_is_active, p_platform_listed, p_gst_percentage, p_hsn_code, p_sub_category
    )
    RETURNING id INTO v_product_id;

    RETURN jsonb_build_object('success', true, 'id', v_product_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_update_shopping_product(
    p_id uuid,
    p_title text,
    p_description text,
    p_category text,
    p_category_id uuid,
    p_wholesale_price bigint,
    p_retail_price bigint,
    p_mrp_paise bigint DEFAULT 0,
    p_admin_stock integer DEFAULT 0,
    p_product_images text[] DEFAULT '{}'::text[],
    p_is_active boolean DEFAULT true,
    p_platform_listed boolean DEFAULT true,
    p_gst_percentage integer DEFAULT 0,
    p_hsn_code text DEFAULT '9971'::text,
    p_sub_category text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role text;
BEGIN
    v_admin_role := auth.jwt() ->> 'role';
    
    IF v_admin_role IS NULL THEN
        SELECT role INTO v_admin_role
        FROM public.user_profiles
        WHERE id = auth.uid();

        IF v_admin_role IS NULL OR v_admin_role NOT IN ('admin', 'super_admin') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin or Super Admin role required');
        END IF;
    END IF;

    UPDATE public.shopping_products
    SET
        title = p_title,
        description = p_description,
        category = p_category,
        category_id = p_category_id,
        wholesale_price_paise = p_wholesale_price,
        suggested_retail_price_paise = p_retail_price,
        mrp_paise = p_mrp_paise,
        admin_stock = p_admin_stock,
        product_images = p_product_images,
        is_active = p_is_active,
        platform_listed = p_platform_listed,
        gst_percentage = p_gst_percentage,
        hsn_code = p_hsn_code,
        sub_category = p_sub_category,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;

COMMIT;
