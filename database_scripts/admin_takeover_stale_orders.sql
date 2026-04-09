-- Step 4 — Create admin_takeover_stale_orders RPC

CREATE OR REPLACE FUNCTION public.admin_takeover_stale_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stale_order RECORD;
    v_count INT := 0;
    v_new_platform_cut BIGINT;
    v_new_merchant_profit BIGINT;
    v_total_product_value BIGINT;
    v_total_cost_price BIGINT;
    v_total_profit BIGINT;
BEGIN
    FOR v_stale_order IN 
        SELECT sog.*, m.user_id as merchant_user_id
        FROM public.shopping_order_groups sog
        JOIN public.merchants m ON sog.merchant_id = m.id
        WHERE sog.delivery_status = 'pending'
          AND sog.settlement_status = 'pending'
          AND sog.is_platform_order = false
          AND sog.status = 'completed'
          AND sog.created_at < NOW() - INTERVAL '2 hours'
          AND sog.merchant_id IS NOT NULL
    LOOP
        -- CORRECT FORMULA: Commission on profit margin, not gross
        -- total_product_value = sale total excluding delivery
        -- total_cost_price = sum of (wholesale_price * quantity) across all items
        -- total_profit = MAX(0, product_value - cost_price)
        -- platform_cut = total_profit * 70%
        -- merchant_share = total_product_value - platform_cut
        v_total_product_value := v_stale_order.total_amount_paise - COALESCE(v_stale_order.delivery_fee_paise, 0);

        SELECT COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)
        INTO v_total_cost_price
        FROM public.shopping_order_items i
        JOIN public.shopping_products p ON i.product_id = p.id
        WHERE i.group_id = v_stale_order.id;

        v_total_profit := GREATEST(0, v_total_product_value - v_total_cost_price);
        v_new_platform_cut := ROUND(v_total_profit * 70 / 100);
        v_new_merchant_profit := v_total_product_value - v_new_platform_cut;
        
        -- Update order group
        UPDATE public.shopping_order_groups
        SET commission_rate = 0.30,
            platform_cut_paise = v_new_platform_cut,
            merchant_profit_paise = v_new_merchant_profit,
            assigned_to = NULL,
            admin_takeover_at = NOW(),
            settlement_status = 'admin_takeover'
        WHERE id = v_stale_order.id;

        -- Update shopping_order_items with corrected profit-based commission values
        UPDATE public.shopping_order_items soi
        SET commission_amount_paise = GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100,
            profit_paise = (soi.unit_price_paise * soi.quantity)
                           - GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100
                           - (COALESCE(p.wholesale_price_paise, 0) * soi.quantity)
        FROM public.shopping_products p
        WHERE soi.product_id = p.id
          AND soi.group_id = v_stale_order.id;

        -- Credit merchant wallet with 30% share
        UPDATE public.merchants
        SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + v_new_merchant_profit,
            total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_new_platform_cut
        WHERE id = v_stale_order.merchant_id;

        -- Insert merchant transaction
        INSERT INTO public.merchant_transactions (
           merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
        ) VALUES (
           v_stale_order.merchant_id, 'sale', v_new_merchant_profit, v_new_platform_cut,
           (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_stale_order.merchant_id),
           'Order auto-escalated to admin — merchant did not respond within 2 hours. Commission reduced to 30%.'
        );

        -- Notifications
        INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (
            v_stale_order.merchant_user_id, 
            'Order Reassigned ⚠️', 
            'Order #' || substring(v_stale_order.id::text from 1 for 8) || ' was reassigned to admin due to inactivity. Your commission reduced to 30%.', 
            'warning', 
            v_stale_order.id, 
            'shopping_order'
        );

        INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
        SELECT id, 'Order Takeover 📋', 'Order #' || substring(v_stale_order.id::text from 1 for 8) || ' auto-transferred. Merchant did not respond within 2 hours.', 'info', v_stale_order.id, 'shopping_order'
        FROM public.user_profiles
        WHERE role IN ('admin', 'super_admin');

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'orders_transferred', v_count);
END;
$$;

-- Since this is called by server API cron, typically grant to service_role implicitly or execute, but just in case:
-- we don't grant to public/authenticated to prevent arbitrary triggers.
REVOKE EXECUTE ON FUNCTION public.admin_takeover_stale_orders() FROM public;
REVOKE EXECUTE ON FUNCTION public.admin_takeover_stale_orders() FROM authenticated;
