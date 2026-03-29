-- Update admin_insert_shopping_product RPC to accept p_product_images
CREATE OR REPLACE FUNCTION admin_insert_shopping_product(
    p_title text,
    p_description text,
    p_category text,
    p_category_id uuid,
    p_wholesale_price integer,
    p_retail_price integer,
    p_mrp_paise integer,
    p_admin_stock integer,
    p_image_url text,
    p_product_images text[],
    p_is_active boolean,
    p_gst_percentage integer DEFAULT 0,
    p_hsn_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role text;
    v_product json;
BEGIN
    -- Check that the calling user is an admin
    SELECT role INTO v_user_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_user_role <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    INSERT INTO shopping_products (
        title,
        description,
        category,
        category_id,
        wholesale_price_paise,
        suggested_retail_price_paise,
        mrp_paise,
        admin_stock,
        image_url,
        product_images,
        is_active,
        gst_percentage,
        hsn_code
    ) VALUES (
        p_title,
        p_description,
        p_category,
        p_category_id,
        p_wholesale_price,
        p_retail_price,
        p_mrp_paise,
        p_admin_stock,
        p_image_url,
        p_product_images,
        p_is_active,
        p_gst_percentage,
        p_hsn_code
    )
    RETURNING to_json(shopping_products.*) INTO v_product;

    RETURN v_product;
END;
$$;

-- Update admin_update_shopping_product RPC to accept p_product_images
CREATE OR REPLACE FUNCTION admin_update_shopping_product(
    p_id uuid,
    p_title text,
    p_description text,
    p_category text,
    p_category_id uuid,
    p_wholesale_price integer,
    p_retail_price integer,
    p_mrp_paise integer,
    p_admin_stock integer,
    p_image_url text,
    p_product_images text[],
    p_is_active boolean,
    p_gst_percentage integer DEFAULT 0,
    p_hsn_code text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role text;
    v_product json;
BEGIN
    -- Check that the calling user is an admin
    SELECT role INTO v_user_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_user_role <> 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    UPDATE shopping_products SET
        title = p_title,
        description = p_description,
        category = p_category,
        category_id = p_category_id,
        wholesale_price_paise = p_wholesale_price,
        suggested_retail_price_paise = p_retail_price,
        mrp_paise = p_mrp_paise,
        admin_stock = p_admin_stock,
        image_url = p_image_url,
        product_images = p_product_images,
        is_active = p_is_active,
        gst_percentage = p_gst_percentage,
        hsn_code = p_hsn_code,
        updated_at = now()
    WHERE id = p_id
    RETURNING to_json(shopping_products.*) INTO v_product;

    RETURN v_product;
END;
$$;
