-- =============================================================
-- Admin Update Product Stock RPC
-- Lightweight RPC to only update admin_stock for platform products
-- =============================================================

CREATE OR REPLACE FUNCTION admin_update_product_stock(
    p_id UUID,
    p_admin_stock INT
) RETURNS JSON AS $$
DECLARE
    v_product_record RECORD;
BEGIN
    -- Update only if it's a platform product (merchant_owner_id IS NULL)
    UPDATE public.shopping_products
    SET 
        admin_stock = p_admin_stock,
        updated_at = NOW()
    WHERE id = p_id AND merchant_owner_id IS NULL
    RETURNING * INTO v_product_record;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Platform product not found or you lack permissions';
    END IF;

    RETURN row_to_json(v_product_record);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
