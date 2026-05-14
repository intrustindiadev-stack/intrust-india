-- ============================================================
-- Migration: 20260422_fix_order_delivery_overload_and_settlement
-- Description:
--   1. Drop broken 3-parameter overload of update_order_delivery_v3.
--   2. Update customer_checkout_v4 to defer merchant settlement.
--   3. Add merchant_escalate_order RPC for "Cannot Fulfill" feature.
-- ============================================================

-- Part A: Drop broken Overload 1
DROP FUNCTION IF EXISTS public.update_order_delivery_v3(uuid, text, text);

-- Part B: Update customer_checkout_v4 to defer merchant settlement
CREATE OR REPLACE FUNCTION public.customer_checkout_v4(p_customer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_paise        BIGINT := 0;
    v_wallet_balance     BIGINT;
    v_cart_items         RECORD;
    v_group_id           UUID;
    v_item               RECORD;
    v_merchant_id        UUID;
    v_is_platform        BOOLEAN;
    v_delivery_address   TEXT;
    v_customer_name      TEXT;
    v_customer_phone     TEXT;
    v_item_total         BIGINT;
    v_product_cost       BIGINT;
    v_commission_paise   BIGINT;
    v_total_platform_cut BIGINT := 0;
    v_delivery_fee_paise BIGINT := 5000;
BEGIN
    SELECT balance_paise INTO v_wallet_balance
    FROM public.customer_wallets
    WHERE user_id = p_customer_id;

    IF v_wallet_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    SELECT full_name, phone, address
    INTO v_customer_name, v_customer_phone, v_delivery_address
    FROM public.user_profiles
    WHERE id = p_customer_id;

    IF v_delivery_address IS NULL OR v_delivery_address = '' THEN
        SELECT full_address INTO v_delivery_address
        FROM public.kyc_records
        WHERE user_id = p_customer_id;
    END IF;

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
            COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise) AS effective_price,
            mi.stock_quantity  AS merchant_stock,
            p.admin_stock      AS platform_stock,
            p.title            AS product_title,
            p.gst_percentage   AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products  p  ON c.product_id  = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        v_total_paise := v_total_paise
            + (v_cart_items.effective_price * v_cart_items.quantity)
            + ROUND(v_cart_items.effective_price * v_cart_items.quantity
                    * COALESCE(v_cart_items.gst_pct, 0) / 100);

        IF v_cart_items.is_platform_item THEN
            IF v_cart_items.platform_stock < v_cart_items.quantity THEN
                RETURN jsonb_build_object('success', false, 'message',
                    'Insufficient platform stock for ' || v_cart_items.product_title);
            END IF;
        ELSE
            IF v_cart_items.merchant_stock < v_cart_items.quantity THEN
                RETURN jsonb_build_object('success', false, 'message',
                    'Insufficient merchant stock for ' || v_cart_items.product_title);
            END IF;
        END IF;
    END LOOP;

    v_total_paise := v_total_paise + v_delivery_fee_paise;

    IF v_wallet_balance < v_total_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- Defer settlement: always start as 'pending'
    INSERT INTO public.shopping_order_groups (
        customer_id, customer_name, customer_phone,
        total_amount_paise, status, payment_status, delivery_status,
        merchant_id, is_platform_order, delivery_address,
        delivery_fee_paise, payment_method, settlement_status
    )
    VALUES (
        p_customer_id, v_customer_name, v_customer_phone,
        v_total_paise, 'pending', 'paid', 'pending',
        v_merchant_id, v_is_platform, v_delivery_address,
        v_delivery_fee_paise, 'wallet',
        'pending'
    )
    RETURNING id INTO v_group_id;

    FOR v_item IN
        SELECT
            c.*,
            COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise) AS effective_price,
            mi.merchant_id,
            p.wholesale_price_paise AS platform_cost,
            p.gst_percentage        AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products  p  ON c.product_id  = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        v_item_total := v_item.effective_price * v_item.quantity;

        IF v_item.is_platform_item THEN
            UPDATE public.shopping_products
            SET admin_stock = admin_stock - v_item.quantity, updated_at = now()
            WHERE id = v_item.product_id;

            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id,
                quantity, unit_price_paise, cost_price_paise, profit_paise, gst_amount_paise
            ) VALUES (
                v_group_id, NULL, v_item.product_id, NULL,
                v_item.quantity, v_item.effective_price, v_item.platform_cost,
                (v_item.effective_price - COALESCE(v_item.platform_cost, 0)) * v_item.quantity,
                ROUND(v_item.effective_price * v_item.quantity * COALESCE(v_item.gst_pct, 0) / 100)
            );

        ELSE
            -- 30% commission on profit margin
            v_product_cost     := COALESCE(v_item.platform_cost, 0);
            v_commission_paise := GREATEST(0,
                (v_item.effective_price - v_product_cost) * v_item.quantity * 30 / 100);
            v_total_platform_cut := v_total_platform_cut + v_commission_paise;

            UPDATE public.merchant_inventory
            SET stock_quantity = stock_quantity - v_item.quantity, updated_at = now()
            WHERE id = v_item.inventory_id;

            -- We still populate profit_paise and commission_amount_paise for the ledger
            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id,
                quantity, unit_price_paise, cost_price_paise,
                profit_paise, commission_amount_paise, gst_amount_paise
            ) VALUES (
                v_group_id, v_item.merchant_id, v_item.product_id, v_item.inventory_id,
                v_item.quantity, v_item.effective_price, v_product_cost,
                (v_item_total - v_commission_paise) - (v_product_cost * v_item.quantity),
                v_commission_paise,
                ROUND(v_item.effective_price * v_item.quantity * COALESCE(v_item.gst_pct, 0) / 100)
            );

            -- REMOVED: Immediate wallet update and transaction log (Deferred to fulfillment)

            INSERT INTO public.notifications (
                user_id, title, body, type, reference_id, reference_type
            )
            SELECT user_id, 'New Order Received 🛒',
                   'A customer placed an order. Check your orders page.',
                   'success', v_group_id, 'shopping_order'
            FROM public.merchants WHERE id = v_item.merchant_id;
        END IF;
    END LOOP;

    -- Persist group-level settlement fields for merchant orders
    IF NOT v_is_platform THEN
        UPDATE public.shopping_order_groups
        SET commission_rate       = 0.30,
            platform_cut_paise    = v_total_platform_cut,
            merchant_profit_paise = (
                SELECT SUM((i.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))
                           * i.quantity) - v_total_platform_cut
                FROM public.shopping_order_items i
                JOIN public.shopping_products    p ON i.product_id = p.id
                WHERE i.group_id = v_group_id
            )
        WHERE id = v_group_id;
    END IF;

    UPDATE public.customer_wallets
    SET balance_paise = balance_paise - v_total_paise, updated_at = now()
    WHERE user_id = p_customer_id;

    INSERT INTO public.customer_wallet_transactions (
        wallet_id, user_id, type, amount_paise,
        balance_before_paise, balance_after_paise, description
    ) VALUES (
        (SELECT id FROM public.customer_wallets WHERE user_id = p_customer_id),
        p_customer_id, 'DEBIT', v_total_paise,
        v_wallet_balance, v_wallet_balance - v_total_paise,
        'Shopping Purchase: Order Group ' || v_group_id
    );

    DELETE FROM public.shopping_cart WHERE customer_id = p_customer_id;

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id);
END;
$function$;

-- Part E: Add merchant_escalate_order RPC
CREATE OR REPLACE FUNCTION public.merchant_escalate_order(
    p_order_id uuid,
    p_merchant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order            RECORD;
    v_new_platform_cut    bigint;
    v_new_merchant_profit bigint;
    v_merchant_user_id    uuid;
    v_total_product_value bigint;
    v_total_cost_price    bigint;
    v_total_profit        bigint;
BEGIN
    -- Verify ownership and eligibility
    SELECT sog.*, m.user_id INTO v_order
    FROM public.shopping_order_groups sog
    JOIN public.merchants m ON sog.merchant_id = m.id
    WHERE sog.id = p_order_id
      AND sog.merchant_id = p_merchant_id
      AND sog.delivery_status = 'pending'
      AND sog.settlement_status = 'pending'
      AND sog.is_platform_order = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not eligible for escalation');
    END IF;

    v_merchant_user_id := v_order.user_id;

    -- Commission formula: 70% of profit margin (Escalation penalty)
    v_total_product_value := v_order.total_amount_paise - COALESCE(v_order.delivery_fee_paise, 0);

    SELECT COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)
    INTO v_total_cost_price
    FROM public.shopping_order_items i
    JOIN public.shopping_products    p ON i.product_id = p.id
    WHERE i.group_id = p_order_id;

    v_total_profit        := GREATEST(0, v_total_product_value - v_total_cost_price);
    v_new_platform_cut    := ROUND(v_total_profit * 70 / 100);
    v_new_merchant_profit := v_total_product_value - v_new_platform_cut;

    -- Update order group
    UPDATE public.shopping_order_groups
    SET commission_rate    = 0.30, -- Fixed base rate, but cut is 70% of profit
        platform_cut_paise = v_new_platform_cut,
        merchant_profit_paise = v_new_merchant_profit,
        assigned_to        = NULL,
        admin_takeover_at  = NOW(),
        settlement_status  = 'admin_takeover'
    WHERE id = v_order.id;

    -- Update per-item commissions in ledger
    UPDATE public.shopping_order_items soi
    SET commission_amount_paise =
            GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0)))
            * soi.quantity * 70 / 100,
        profit_paise =
            (soi.unit_price_paise * soi.quantity)
            - GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100
            - (COALESCE(p.wholesale_price_paise, 0) * soi.quantity)
    FROM public.shopping_products p
    WHERE soi.product_id = p.id
      AND soi.group_id   = v_order.id;

    -- Credit merchant wallet immediately (Escalation settles the order immediately)
    UPDATE public.merchants
    SET wallet_balance_paise        = COALESCE(wallet_balance_paise, 0)        + v_new_merchant_profit,
        total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_new_platform_cut
    WHERE id = v_order.merchant_id;

    -- Merchant transaction log
    INSERT INTO public.merchant_transactions (
        merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
    ) VALUES (
        v_order.merchant_id, 'sale', v_new_merchant_profit, v_new_platform_cut,
        (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
        'Order escalated to admin by merchant. Commission adjusted to 70% of profit.'
    );

    -- Notification
    INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
    VALUES (
        v_merchant_user_id,
        'Order Escalated ✅',
        'Order #' || substring(v_order.id::text from 1 for 8) || ' escalated to admin. Reduced profit has been credited to your wallet.',
        'info',
        v_order.id,
        'shopping_order'
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.merchant_escalate_order(uuid, uuid) TO authenticated;
