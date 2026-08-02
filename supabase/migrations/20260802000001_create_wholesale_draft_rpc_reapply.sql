CREATE OR REPLACE FUNCTION create_wholesale_draft(
    p_merchant_id uuid,
    p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item record;
    v_product record;
    v_total_paise bigint := 0;
    v_base_paise bigint;
    v_gst_paise bigint;
    v_validated_items jsonb := '[]'::jsonb;
    v_draft_id uuid;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id uuid, quantity int)
    LOOP
        SELECT * INTO v_product
        FROM shopping_products
        WHERE id = v_item.product_id
        FOR UPDATE;

        IF v_product IS NULL THEN
            RAISE EXCEPTION 'Product not found: %', v_item.product_id;
        END IF;

        IF v_product.admin_stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for %', v_product.title;
        END IF;

        v_base_paise := v_product.wholesale_price_paise * v_item.quantity;
        v_gst_paise := ROUND(v_base_paise * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_total_paise := v_total_paise + v_base_paise + v_gst_paise;

        v_validated_items := v_validated_items || jsonb_build_object(
            'product_id', v_product.id,
            'quantity', v_item.quantity,
            'unit_price_paise', v_product.wholesale_price_paise,
            'gst_amount_paise', v_gst_paise
        );
    END LOOP;

    INSERT INTO wholesale_order_drafts (
        merchant_id,
        items,
        total_amount_paise,
        expected_amount_paise,
        status
    ) VALUES (
        p_merchant_id,
        v_validated_items,
        v_total_paise,
        v_total_paise,
        'pending'
    ) RETURNING id INTO v_draft_id;

    RETURN jsonb_build_object(
        'success', true,
        'draft_id', v_draft_id,
        'total_amount_paise', v_total_paise
    );
END;
$$;

-- Revoke all and grant to service_role
REVOKE ALL ON FUNCTION create_wholesale_draft(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_wholesale_draft(uuid, jsonb) TO service_role;
