-- ================================================
-- FIX: WHOLESALE GST IN purchase_platform_products_bulk
-- ================================================
-- Updates the bulk wholesale purchase RPC to:
--   1. Fetch gst_percentage alongside wholesale_price_paise
--   2. Compute GST-inclusive item cost in the pre-validation loop
--   3. Deduct the GST-inclusive amount from the merchant wallet
--   4. Store gst_amount_paise in transaction metadata for auditability

CREATE OR REPLACE FUNCTION public.purchase_platform_products_bulk(
    p_items JSONB[], -- Array of {product_id: UUID, quantity: INT}
    p_merchant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_item_cost_paise BIGINT;
    v_total_cost BIGINT := 0;
    v_merchant_balance BIGINT;
    v_new_balance BIGINT;
    v_product RECORD;
    v_gst_amount_paise BIGINT;
BEGIN
    -- 0. Identity Validation
    IF NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    -- 1. Pre-validation loop: Check all stocks and calculate GST-inclusive total cost
    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
        END IF;

        SELECT wholesale_price_paise, admin_stock, title, gst_percentage INTO v_product
        FROM public.shopping_products WHERE id = v_product_id;

        IF v_product.admin_stock < v_qty THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock for ' || v_product.title);
        END IF;

        -- GST-inclusive item cost
        v_item_cost_paise := v_product.wholesale_price_paise * v_qty
                           + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_total_cost := v_total_cost + v_item_cost_paise;
    END LOOP;

    -- 2. Check and lock merchant balance
    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    -- 3. Execute updates in a single loop
    v_new_balance := v_merchant_balance;

    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT wholesale_price_paise, gst_percentage INTO v_product
        FROM public.shopping_products WHERE id = v_product_id FOR UPDATE;

        -- GST-inclusive item cost for deduction
        v_item_cost_paise := v_product.wholesale_price_paise * v_qty
                           + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_gst_amount_paise := ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);

        -- Update Stock
        UPDATE public.shopping_products SET admin_stock = admin_stock - v_qty WHERE id = v_product_id;

        -- Add to Inventory
        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise, 
            is_platform_product, is_active, custom_title, custom_description
        )
        SELECT 
            p_merchant_id, v_product_id, v_qty, suggested_retail_price_paise, 
            true, false, title, description
        FROM public.shopping_products WHERE id = v_product_id
        ON CONFLICT (merchant_id, product_id) DO UPDATE
        SET stock_quantity = merchant_inventory.stock_quantity + v_qty;

        -- Log Order (record base wholesale price for the unit price)
        INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
        VALUES (p_merchant_id, 'merchant', NULL, 'admin', v_product_id, v_qty, v_product.wholesale_price_paise, v_item_cost_paise, 'wholesale');

        -- Update local tracking for ledger
        v_new_balance := v_new_balance - v_item_cost_paise;

        -- Log Transaction (One per item for detailed history, with GST in metadata)
        INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
        VALUES (
            p_merchant_id, 'purchase', -v_item_cost_paise, v_new_balance,
            'Wholesale bulk purchase (GST-inclusive)',
            jsonb_build_object(
                'product_id', v_product_id,
                'quantity', v_qty,
                'wholesale_amount_paise', v_product.wholesale_price_paise * v_qty,
                'gst_amount_paise', v_gst_amount_paise,
                'gst_percentage', COALESCE(v_product.gst_percentage, 0)
            )
        );
    END LOOP;

    -- Final Balance Sync
    UPDATE public.merchants SET wallet_balance_paise = v_new_balance WHERE id = p_merchant_id;

    RETURN jsonb_build_object('success', true, 'message', 'Bulk purchase successful');
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_platform_products_bulk(JSONB[], UUID) TO authenticated, service_role;
