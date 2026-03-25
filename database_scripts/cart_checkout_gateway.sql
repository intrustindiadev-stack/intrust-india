CREATE OR REPLACE FUNCTION public.draft_cart_orders(
    p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_paise BIGINT := 0;
    v_cart_items RECORD;
    v_group_id UUID;
    v_merchant_id UUID;
    v_is_platform BOOLEAN;
    v_delivery_address TEXT;
    v_delivery_fee_paise BIGINT := 5000;
    v_item RECORD;
BEGIN
    -- 1. Get Delivery Address from profile
    SELECT address INTO v_delivery_address
    FROM public.user_profiles
    WHERE id = p_customer_id;

    IF v_delivery_address IS NULL OR v_delivery_address = '' THEN
        SELECT full_address INTO v_delivery_address
        FROM public.kyc_records
        WHERE user_id = p_customer_id;
    END IF;

    -- 2. Identify Merchant/Platform and Validate Stock
    SELECT is_platform_item INTO v_is_platform
    FROM public.shopping_cart
    WHERE customer_id = p_customer_id
    LIMIT 1;

    IF v_is_platform IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cart is empty');
    END IF;

    IF NOT v_is_platform THEN
        SELECT mi.merchant_id INTO v_merchant_id
        FROM public.shopping_cart sc
        JOIN public.merchant_inventory mi ON sc.inventory_id = mi.id
        WHERE sc.customer_id = p_customer_id
        LIMIT 1;
    END IF;

    FOR v_cart_items IN 
        SELECT 
            c.*, 
            COALESCE(mi.retail_price_paise, p.suggested_retail_price_paise) as effective_price,
            mi.stock_quantity as merchant_stock,
            p.admin_stock as platform_stock,
            p.title as product_title
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN public.shopping_products p ON c.product_id = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        v_total_paise := v_total_paise + (v_cart_items.effective_price * v_cart_items.quantity);
        
        IF v_cart_items.is_platform_item THEN
            IF v_cart_items.platform_stock < v_cart_items.quantity THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient platform stock for ' || v_cart_items.product_title);
            END IF;
        ELSE
            IF v_cart_items.merchant_stock < v_cart_items.quantity THEN
                RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant stock for ' || v_cart_items.product_title);
            END IF;
        END IF;
    END LOOP;

    v_total_paise := v_total_paise + v_delivery_fee_paise;

    -- 3. CREATE ORDER GROUP
    INSERT INTO public.shopping_order_groups (
        customer_id, total_amount_paise, status, delivery_status, merchant_id, is_platform_order, delivery_address, delivery_fee_paise
    )
    VALUES (
        p_customer_id, v_total_paise, 'pending', 'pending', v_merchant_id, v_is_platform, v_delivery_address, v_delivery_fee_paise
    )
    RETURNING id INTO v_group_id;

    -- 4. PROCESS ITEMS (Draft state - record intent)
    FOR v_item IN 
        SELECT 
            c.*, 
            COALESCE(mi.retail_price_paise, p.suggested_retail_price_paise) as effective_price,
            mi.merchant_id,
            p.wholesale_price_paise as platform_cost
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN public.shopping_products p ON c.product_id = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        IF v_item.is_platform_item THEN
            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id, quantity, unit_price_paise, cost_price_paise, profit_paise
            ) VALUES (
                v_group_id, NULL, v_item.product_id, NULL, v_item.quantity, v_item.effective_price, v_item.platform_cost, 
                (v_item.effective_price - v_item.platform_cost) * v_item.quantity
            );
        ELSE
            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id, quantity, unit_price_paise, cost_price_paise, profit_paise
            ) VALUES (
                v_group_id, v_item.merchant_id, v_item.product_id, v_item.inventory_id, v_item.quantity, v_item.effective_price, 
                0, -- Updated on finalize
                0
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id, 'total_paise', v_total_paise);
END;
$$;


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

    -- Process stock deductions and payments
    FOR v_item IN 
        SELECT i.*, p.admin_stock, mi.stock_quantity as merchant_stock
        FROM public.shopping_order_items i
        JOIN public.shopping_products p ON i.product_id = p.id
        LEFT JOIN public.merchant_inventory mi ON i.inventory_id = mi.id
        WHERE i.group_id = p_group_id
    LOOP
        v_item_total := v_item.unit_price_paise * v_item.quantity;

        IF v_group.is_platform_order THEN
            UPDATE public.shopping_products 
            SET admin_stock = admin_stock - v_item.quantity,
                updated_at = now()
            WHERE id = v_item.product_id;
        ELSE
            v_commission_paise := (v_item_total * 5) / 100;
            v_merchant_credit := v_item_total - v_commission_paise;

            UPDATE public.merchant_inventory 
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at = now()
            WHERE id = v_item.inventory_id;

            UPDATE public.shopping_order_items
            SET cost_price_paise = v_merchant_credit / v_item.quantity,
                profit_paise = v_commission_paise
            WHERE id = v_item.id;

            UPDATE public.merchants
            SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + v_merchant_credit,
                total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_commission_paise,
                updated_at = now()
            WHERE id = v_item.seller_id;
            
            INSERT INTO public.merchant_transactions (
                merchant_id, transaction_type, amount_paise, balance_after_paise, description
            ) VALUES (
                v_item.seller_id, 'sale', v_merchant_credit,
                (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_item.seller_id),
                'Sale profit after 5% commission deduction (Gateway Checkout)'
            );
        END IF;
    END LOOP;

    -- CLEAR CART
    DELETE FROM public.shopping_cart WHERE customer_id = p_customer_id;

    RETURN jsonb_build_object('success', true);
END;
$$;
