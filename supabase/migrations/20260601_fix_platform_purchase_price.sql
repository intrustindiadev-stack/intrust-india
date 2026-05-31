-- ============================================================
-- FIX: Platform purchase RPCs — use platform_price_paise
-- When platform_price_paise is set (non-NULL) on a product,
-- that is the authoritative price for customer-facing sales.
-- Falls back to suggested_retail_price_paise for older rows.
-- ============================================================

-- 10. RPC: Customer Purchase From Platform (Direct Admin Sale) [FIXED]
CREATE OR REPLACE FUNCTION public.customer_purchase_from_platform(
    p_product_id UUID,
    p_quantity INTEGER,
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_price_paise BIGINT;
    v_total_cost BIGINT;
    v_customer_balance BIGINT;
BEGIN
    -- 1. Get product details (lock row for update)
    SELECT id, admin_stock, platform_price_paise, suggested_retail_price_paise
    INTO v_product
    FROM public.shopping_products
    WHERE id = p_product_id
    FOR UPDATE;

    IF v_product.admin_stock < p_quantity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient platform stock');
    END IF;

    -- Use platform_price_paise when set; fall back to suggested_retail_price_paise
    v_price_paise := COALESCE(v_product.platform_price_paise, v_product.suggested_retail_price_paise);
    v_total_cost  := v_price_paise * p_quantity;

    -- 2. Check customer balance
    SELECT wallet_balance_paise INTO v_customer_balance
    FROM public.user_profiles WHERE id = p_customer_id FOR UPDATE;

    IF v_customer_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- 3. Update balances and stock
    UPDATE public.user_profiles
    SET wallet_balance_paise = wallet_balance_paise - v_total_cost
    WHERE id = p_customer_id;

    UPDATE public.shopping_products
    SET admin_stock = admin_stock - p_quantity
    WHERE id = p_product_id;

    -- 4. Log Order
    INSERT INTO public.shopping_orders (
        buyer_id, buyer_type, seller_id, seller_type,
        product_id, quantity, unit_price_paise, total_price_paise, order_type
    )
    VALUES (
        p_customer_id, 'customer', NULL, 'admin',
        p_product_id, p_quantity, v_price_paise, v_total_cost, 'retail'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Order placed successfully');
END;
$$;

-- 11. RPC: Customer Bulk Purchase V2 (Enhanced Ledger) [FIXED]
CREATE OR REPLACE FUNCTION public.customer_bulk_purchase_v2(
    p_items JSONB[], -- Array of {inventory_id: UUID, product_id: UUID, quantity: INT, is_platform: BOOL}
    p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_inventory RECORD;
    v_product RECORD;
    v_total_cost BIGINT := 0;
    v_customer_balance BIGINT;
    v_item_cost BIGINT;
    v_price_paise BIGINT;
    v_merchant_balance BIGINT;
BEGIN
    -- 1. Pre-validation and total cost calculation
    SELECT wallet_balance_paise INTO v_customer_balance
    FROM public.user_profiles WHERE id = p_customer_id FOR UPDATE;

    FOREACH v_item IN ARRAY p_items LOOP
        IF (v_item->>'is_platform')::BOOLEAN THEN
            SELECT admin_stock, platform_price_paise, suggested_retail_price_paise, title
            INTO v_product
            FROM public.shopping_products
            WHERE id = (v_item->>'product_id')::UUID;

            IF v_product.admin_stock < (v_item->>'quantity')::INTEGER THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient platform stock for ' || v_product.title);
            END IF;

            v_price_paise := COALESCE(v_product.platform_price_paise, v_product.suggested_retail_price_paise);
            v_total_cost  := v_total_cost + (v_price_paise * (v_item->>'quantity')::INTEGER);
        ELSE
            SELECT stock_quantity, retail_price_paise INTO v_inventory
            FROM public.merchant_inventory WHERE id = (v_item->>'inventory_id')::UUID;

            IF v_inventory.stock_quantity < (v_item->>'quantity')::INTEGER THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant stock');
            END IF;

            v_total_cost := v_total_cost + (v_inventory.retail_price_paise * (v_item->>'quantity')::INTEGER);
        END IF;
    END LOOP;

    IF v_customer_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- 2. Processing items
    FOREACH v_item IN ARRAY p_items LOOP
        IF (v_item->>'is_platform')::BOOLEAN THEN
            SELECT id, platform_price_paise, suggested_retail_price_paise
            INTO v_product
            FROM public.shopping_products
            WHERE id = (v_item->>'product_id')::UUID
            FOR UPDATE;

            v_price_paise := COALESCE(v_product.platform_price_paise, v_product.suggested_retail_price_paise);
            v_item_cost   := v_price_paise * (v_item->>'quantity')::INTEGER;

            UPDATE public.shopping_products
            SET admin_stock = admin_stock - (v_item->>'quantity')::INTEGER
            WHERE id = v_product.id;

            INSERT INTO public.shopping_orders (
                buyer_id, buyer_type, seller_id, seller_type,
                product_id, quantity, unit_price_paise, total_price_paise, order_type
            )
            VALUES (
                p_customer_id, 'customer', NULL, 'admin',
                v_product.id, (v_item->>'quantity')::INTEGER, v_price_paise, v_item_cost, 'retail'
            );
        ELSE
            SELECT * INTO v_inventory
            FROM public.merchant_inventory
            WHERE id = (v_item->>'inventory_id')::UUID
            FOR UPDATE;

            v_item_cost := v_inventory.retail_price_paise * (v_item->>'quantity')::INTEGER;

            UPDATE public.merchant_inventory
            SET stock_quantity = stock_quantity - (v_item->>'quantity')::INTEGER
            WHERE id = v_inventory.id;

            UPDATE public.merchants
            SET wallet_balance_paise = wallet_balance_paise + v_item_cost
            WHERE id = v_inventory.merchant_id
            RETURNING wallet_balance_paise INTO v_merchant_balance;

            INSERT INTO public.shopping_orders (
                buyer_id, buyer_type, seller_id, seller_type,
                product_id, quantity, unit_price_paise, total_price_paise, order_type
            )
            VALUES (
                p_customer_id, 'customer', v_inventory.merchant_id, 'merchant',
                v_inventory.product_id, (v_item->>'quantity')::INTEGER, v_inventory.retail_price_paise, v_item_cost, 'retail'
            );

            INSERT INTO public.merchant_transactions (
                merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
            )
            VALUES (
                v_inventory.merchant_id, 'sale_earnings', v_item_cost, v_merchant_balance,
                'Product sale to customer',
                jsonb_build_object('buyer_id', p_customer_id, 'product_id', v_inventory.product_id)
            );
        END IF;
    END LOOP;

    -- 3. Update customer balance
    UPDATE public.user_profiles
    SET wallet_balance_paise = wallet_balance_paise - v_total_cost
    WHERE id = p_customer_id;

    RETURN jsonb_build_object('success', true, 'message', 'All orders placed successfully');
END;
$$;
