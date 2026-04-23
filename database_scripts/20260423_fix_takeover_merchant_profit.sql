-- ============================================================
-- Migration: 20260423_fix_takeover_merchant_profit
-- Description: 
--   1. Fixes the merchant profit calculation in takeover RPC.
--   2. Backfills existing takeover orders with correct profit logic.
-- ============================================================

-- 1. Update admin_takeover_single_order to reflect 30% of profit margin correctly
CREATE OR REPLACE FUNCTION public.admin_takeover_single_order(
    p_order_id uuid,
    p_admin_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id        uuid;
    v_caller_role      text;
    v_order            RECORD;
    v_new_platform_cut    bigint;
    v_new_merchant_profit bigint;
    v_merchant_user_id    uuid;
    v_total_product_value bigint;
    v_total_cost_price    bigint;
    v_total_profit        bigint;
BEGIN
    -- Derive actor from session
    v_caller_id := auth.uid();

    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: not authenticated');
    END IF;

    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: admin role required');
    END IF;

    -- Fetch the eligible order
    SELECT sog.*, m.user_id INTO v_order
    FROM public.shopping_order_groups sog
    JOIN public.merchants m ON sog.merchant_id = m.id
    WHERE sog.id           = p_order_id
      AND sog.delivery_status   = 'pending'
      AND sog.settlement_status = 'pending'
      AND sog.is_platform_order = false;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not eligible for takeover');
    END IF;

    v_merchant_user_id := v_order.user_id;

    -- Takeover Penalty Law: 70% of profit goes to platform, 30% to merchant
    v_total_product_value := v_order.total_amount_paise - COALESCE(v_order.delivery_fee_paise, 0);

    SELECT COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)
    INTO v_total_cost_price
    FROM public.shopping_order_items i
    JOIN public.shopping_products    p ON i.product_id = p.id
    WHERE i.group_id = p_order_id;

    v_total_profit        := GREATEST(0, v_total_product_value - v_total_cost_price);
    v_new_platform_cut    := ROUND(v_total_profit * 70 / 100);
    v_new_merchant_profit := v_total_profit - v_new_platform_cut; -- FIXED: 30% of profit margin

    -- Update order group
    UPDATE public.shopping_order_groups
    SET commission_rate    = 0.70, -- 70% platform SHARE of profit
        platform_cut_paise = v_new_platform_cut,
        merchant_profit_paise = v_new_merchant_profit,
        assigned_to        = v_caller_id,
        admin_takeover_at  = NOW(),
        settlement_status  = 'admin_takeover'
    WHERE id = v_order.id;

    -- Update per-item commissions
    UPDATE public.shopping_order_items soi
    SET commission_amount_paise =
            GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0)))
            * soi.quantity * 70 / 100,
        profit_paise =
            GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0)))
            * soi.quantity * 30 / 100 -- FIXED: 30% of per-item margin
    FROM public.shopping_products p
    WHERE soi.product_id = p.id
      AND soi.group_id   = v_order.id;

    -- Credit merchant wallet
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
        'Admin Takeover: Merchant profit share reduced to 30% (70% platform commission).'
    );

    -- Notification
    INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
    VALUES (
        v_merchant_user_id,
        'Order Taken Over ⚠️',
        'Order #' || substring(v_order.id::text from 1 for 8) || ' was taken over by admin. Merchant profit share reduced to 30%.',
        'warning',
        v_order.id,
        'shopping_order'
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 2. One-time data fix for existing takeover orders
UPDATE shopping_order_groups og
SET merchant_profit_paise = (
    SELECT GREATEST(0, (og.total_amount_paise - COALESCE(og.delivery_fee_paise, 0))
        - COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)) * 30 / 100
    FROM shopping_order_items i
    JOIN shopping_products p ON i.product_id = p.id
    WHERE i.group_id = og.id
),
platform_cut_paise = (
    SELECT GREATEST(0, (og.total_amount_paise - COALESCE(og.delivery_fee_paise, 0))
        - COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)) * 70 / 100
    FROM shopping_order_items i
    JOIN shopping_products p ON i.product_id = p.id
    WHERE i.group_id = og.id
)
WHERE og.settlement_status = 'admin_takeover';
