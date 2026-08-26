-- Fix RPCs to allow both 'admin' and 'super_admin' roles

CREATE OR REPLACE FUNCTION public.admin_insert_shopping_product(
    p_title text,
    p_description text,
    p_category text,
    p_category_id uuid,
    p_wholesale_price integer,
    p_retail_price integer,
    p_mrp_paise integer,
    p_admin_stock integer,
    p_product_images jsonb,
    p_is_active boolean,
    p_gst_percentage numeric,
    p_hsn_code text
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
        mrp_paise, admin_stock, product_images, is_active, gst_percentage, hsn_code
    ) VALUES (
        p_title, p_description, p_category, p_category_id, p_wholesale_price, p_retail_price,
        p_mrp_paise, p_admin_stock, p_product_images, p_is_active, p_gst_percentage, p_hsn_code
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
    p_wholesale_price integer,
    p_retail_price integer,
    p_mrp_paise integer,
    p_admin_stock integer,
    p_product_images jsonb,
    p_is_active boolean,
    p_gst_percentage numeric,
    p_hsn_code text
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
        gst_percentage = p_gst_percentage,
        hsn_code = p_hsn_code,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_update_product_stock(
    p_id uuid,
    p_admin_stock integer
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
        admin_stock = p_admin_stock,
        updated_at = NOW()
    WHERE id = p_id;

    RETURN jsonb_build_object('success', true, 'id', p_id);
END;
$$;
