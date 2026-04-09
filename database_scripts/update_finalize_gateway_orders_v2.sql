-- Step 2 — Modify finalize_gateway_orders RPC

CREATE OR REPLACE FUNCTION public.finalize_gateway_orders(
    p_group_id uuid,
    p_customer_id uuid,
    p_amount_paise bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_group RECORD;
    v_item RECORD;
    v_item_total BIGINT;
    v_commission_paise BIGINT;
    v_merchant_credit BIGINT;
    v_product_cost BIGINT;
    v_merchant_profit BIGINT;
    v_total_platform_cut BIGINT := 0;
BEGIN
    SELECT * INTO v_group FROM public.shopping_order_groups WHERE id = p_group_id AND customer_id = p_customer_id AND status = 'pending';
    
    IF v_group.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or already processed order group');
    END IF;

    IF v_group.total_amount_paise != p_amount_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch');
    END IF;

    -- Update order group to completed
    UPDATE public.shopping_order_groups SET status = 'completed' WHERE id = p_group_id;

    -- Process items
    FOR v_item IN 
        SELECT i.*, p.admin_stock, p.wholesale_price_paise, mi.stock_quantity as merchant_stock
        FROM public.shopping_order_items i
        JOIN public.shopping_products p ON i.product_id = p.id
        LEFT JOIN public.merchant_inventory mi ON i.inventory_id = mi.id
        WHERE i.group_id = p_group_id
    LOOP
        v_item_total := v_item.unit_price_paise * v_item.quantity;

        IF v_group.is_platform_order THEN
            -- Platform Order: Admin is the seller
            UPDATE public.shopping_products 
            SET admin_stock = admin_stock - v_item.quantity,
                updated_at = now()
            WHERE id = v_item.product_id;
        ELSE
            -- CORRECT FORMULA: Commission on profit margin only
            -- profit_per_unit = MAX(0, retail_price - wholesale_price)
            v_product_cost := COALESCE(v_item.wholesale_price_paise, 0);
            v_commission_paise := GREATEST(0, (v_item.unit_price_paise - v_product_cost)) * v_item.quantity * 30 / 100;
            v_total_platform_cut := v_total_platform_cut + v_commission_paise;
            v_merchant_credit := v_item_total - v_commission_paise;

            -- Merchant's pure margin profit = credit received minus inventory cost
            v_merchant_profit := v_merchant_credit - (v_product_cost * v_item.quantity);

            UPDATE public.merchant_inventory 
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at = now()
            WHERE id = v_item.inventory_id;

            -- Update item stats for ledger
            UPDATE public.shopping_order_items
            SET cost_price_paise = v_product_cost, 
                profit_paise = v_merchant_profit,   
                commission_amount_paise = v_commission_paise 
            WHERE id = v_item.id;

            -- CREDIT DEFERRED TO MERCHANT APPROVAL / ADMIN TAKEOVER
            -- (Removed wallet_balance update and merchant_transaction insert here)

            INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
            SELECT user_id, 'New Order Received 🛒', 'Order #' || substring(p_group_id::text from 1 for 8) || ' has been paid.', 'success', p_group_id, 'shopping_order'
            FROM public.merchants 
            WHERE id = v_item.seller_id;
        END IF;
    END LOOP;

    -- Aggregate Commission Data on Group (if merchant order)
    IF NOT v_group.is_platform_order THEN
        UPDATE public.shopping_order_groups 
        SET commission_rate = 0.30,
            platform_cut_paise = v_total_platform_cut,
            -- merchant_profit_paise = total received by merchant minus total inventory cost across items
            merchant_profit_paise = (
                SELECT SUM((i.unit_price_paise - COALESCE(p.wholesale_price_paise, 0)) * i.quantity) - v_total_platform_cut
                FROM public.shopping_order_items i
                JOIN public.shopping_products p ON i.product_id = p.id
                WHERE i.group_id = p_group_id
            ),
            settlement_status = 'pending'
        WHERE id = p_group_id;
    END IF;

    -- CLEAR CART
    DELETE FROM public.shopping_cart WHERE customer_id = p_customer_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
