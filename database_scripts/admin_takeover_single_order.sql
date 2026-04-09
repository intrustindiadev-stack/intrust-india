-- Step 13 — Create admin_takeover_single_order RPC (Optional but Recommended)

CREATE OR REPLACE FUNCTION public.admin_takeover_single_order(p_order_id UUID, p_admin_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_new_platform_cut BIGINT;
    v_new_merchant_profit BIGINT;
    v_merchant_user_id UUID;
    v_total_product_value BIGINT;
    v_total_cost_price BIGINT;
    v_total_profit BIGINT;
BEGIN
    SELECT sog.*, m.user_id INTO v_order 
    FROM public.shopping_order_groups sog
    JOIN public.merchants m ON sog.merchant_id = m.id
    WHERE sog.id = p_order_id
      AND sog.delivery_status = 'pending'
      AND sog.settlement_status = 'pending'
      AND sog.is_platform_order = false;
    
    -- Extract the user_id from the record for notifications
    v_merchant_user_id := v_order.user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not eligible for takeover');
    END IF;

    -- CORRECT FORMULA: Commission on profit margin, not gross
    -- total_product_value = sale total excluding delivery
    -- total_cost_price = sum of (wholesale_price * quantity) across all items
    -- total_profit = total_product_value - total_cost_price
    -- platform_cut = MAX(0, total_profit) * 70%
    -- merchant_share = total_product_value - platform_cut
    v_total_product_value := v_order.total_amount_paise - COALESCE(v_order.delivery_fee_paise, 0);

    SELECT COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)
    INTO v_total_cost_price
    FROM public.shopping_order_items i
    JOIN public.shopping_products p ON i.product_id = p.id
    WHERE i.group_id = p_order_id;

    v_total_profit := GREATEST(0, v_total_product_value - v_total_cost_price);
    v_new_platform_cut := ROUND(v_total_profit * 70 / 100);
    v_new_merchant_profit := v_total_product_value - v_new_platform_cut;
    
    -- Update order group
    UPDATE public.shopping_order_groups
    SET commission_rate = 0.30,
        platform_cut_paise = v_new_platform_cut,
        merchant_profit_paise = v_new_merchant_profit,
        assigned_to = p_admin_id,
        admin_takeover_at = NOW(),
        settlement_status = 'admin_takeover'
    WHERE id = v_order.id;

    -- Update shopping_order_items with corrected profit-based commission values
    UPDATE public.shopping_order_items soi
    SET commission_amount_paise = GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100,
        profit_paise = (soi.unit_price_paise * soi.quantity)
                       - GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100
                       - (COALESCE(p.wholesale_price_paise, 0) * soi.quantity)
    FROM public.shopping_products p
    WHERE soi.product_id = p.id
      AND soi.group_id = v_order.id;

    -- Credit merchant wallet with 30% share
    UPDATE public.merchants
    SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + v_new_merchant_profit,
        total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_new_platform_cut
    WHERE id = v_order.merchant_id;

    -- Insert merchant transaction
    INSERT INTO public.merchant_transactions (
       merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
    ) VALUES (
       v_order.merchant_id, 'sale', v_new_merchant_profit, v_new_platform_cut,
       (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
       'Order manually taken over by admin. Commission reduced to 30%.'
    );

    -- Notifications
    INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
    VALUES (
        v_merchant_user_id, 
        'Order Reassigned ⚠️', 
        'Order #' || substring(v_order.id::text from 1 for 8) || ' was taken over by admin. Your commission reduced to 30%.', 
        'warning', 
        v_order.id, 
        'shopping_order'
    );

    RETURN jsonb_build_object('success', true);
END;
$$;
