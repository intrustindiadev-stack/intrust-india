-- ============================================================
-- Migration: 20260415_harden_admin_order_rpcs
-- Description:
--   1. Update admin_get_all_orders to authorize admin + super_admin
--   2. Harden admin_takeover_single_order with auth.uid() role check;
--      revoke execute from anon/authenticated, grant only to authenticated
--      (real guard is the in-function role check).
--   3. Fix update_order_delivery_v3: replace dropped app_admins reference
--      with user_profiles role check (admin + super_admin).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1.  admin_get_all_orders — allow super_admin as well as admin
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_all_orders(
    p_limit  integer DEFAULT 200,
    p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role text;
    v_orders      jsonb;
    v_total       integer;
BEGIN
    -- Role guard: must be admin or super_admin
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = auth.uid();

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Total count
    SELECT COUNT(*) INTO v_total
    FROM public.shopping_order_groups;

    -- Paginated result with joined data
    SELECT jsonb_agg(row_to_json(q))
    INTO v_orders
    FROM (
        SELECT
            og.id,
            og.customer_id,
            og.merchant_id,
            og.delivery_status,
            og.settlement_status,
            og.is_platform_order,
            og.total_amount_paise,
            og.delivery_fee_paise,
            og.platform_cut_paise,
            og.merchant_profit_paise,
            og.delivery_address,
            og.tracking_number,
            og.estimated_delivery_at,
            og.status_notes,
            og.assigned_to,
            og.admin_takeover_at,
            og.created_at,
            og.updated_at,
            p.full_name  AS customer_name,
            p.phone      AS customer_phone,
            m.business_name  AS merchant_name,
            m.business_phone AS merchant_phone,
            (
                SELECT json_agg(
                    jsonb_build_object(
                        'id',               oi.id,
                        'product_id',       oi.product_id,
                        'product_title',    pr.title,
                        'quantity',         oi.quantity,
                        'unit_price_paise', oi.unit_price_paise,
                        'price_paise',      (oi.unit_price_paise * oi.quantity),
                        'profit_paise',     oi.profit_paise
                    )
                )
                FROM public.shopping_order_items oi
                LEFT JOIN public.shopping_products pr ON oi.product_id = pr.id
                WHERE oi.group_id = og.id
            ) AS items
        FROM public.shopping_order_groups og
        LEFT JOIN public.user_profiles p ON og.customer_id = p.id
        LEFT JOIN public.merchants      m ON og.merchant_id  = m.id
        ORDER BY og.created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) q;

    RETURN jsonb_build_object(
        'success', true,
        'orders',  COALESCE(v_orders, '[]'::jsonb),
        'total',   v_total
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 2.  admin_takeover_single_order — add auth.uid() role guard;
--     derive admin identity from auth, do not trust p_admin_id.
--     Revoke anon access; only authenticated callers may invoke
--     (they are further gated by the in-function role check).
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_takeover_single_order(
    p_order_id uuid,
    p_admin_id uuid DEFAULT NULL   -- accepted for backward-compat but ignored
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
    -- Derive actor from session; never trust caller-supplied p_admin_id
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

    -- Commission formula: 70% of profit margin
    v_total_product_value := v_order.total_amount_paise - COALESCE(v_order.delivery_fee_paise, 0);

    SELECT COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)
    INTO v_total_cost_price
    FROM public.shopping_order_items i
    JOIN public.shopping_products    p ON i.product_id = p.id
    WHERE i.group_id = p_order_id;

    v_total_profit        := GREATEST(0, v_total_product_value - v_total_cost_price);
    v_new_platform_cut    := ROUND(v_total_profit * 70 / 100);
    v_new_merchant_profit := v_total_product_value - v_new_platform_cut;

    -- Update order group — use authenticated admin id, not caller-supplied arg
    UPDATE public.shopping_order_groups
    SET commission_rate    = 0.30,
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
            (soi.unit_price_paise * soi.quantity)
            - GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100
            - (COALESCE(p.wholesale_price_paise, 0) * soi.quantity)
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
        'Order manually taken over by admin. Commission reduced to 30%.'
    );

    -- Notification
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
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Restrict execute grants on admin_takeover_single_order
REVOKE EXECUTE ON FUNCTION public.admin_takeover_single_order(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_takeover_single_order(uuid, uuid) FROM public;
GRANT  EXECUTE ON FUNCTION public.admin_takeover_single_order(uuid, uuid) TO authenticated;

-- ──────────────────────────────────────────────────────────────
-- 3. update_order_delivery_v3 — replace app_admins with user_profiles
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(
    p_order_id      uuid,
    p_new_status    text,
    p_tracking_number text,
    p_estimated_at  timestamptz,
    p_status_notes  text,
    p_is_admin      boolean DEFAULT false,
    p_is_merchant   boolean DEFAULT false,
    p_is_customer   boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order       RECORD;
    v_user_id     uuid;
    v_caller_role text;
BEGIN
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Authorization checks
    IF p_is_admin THEN
        -- Use user_profiles (replaces dropped app_admins table)
        SELECT role INTO v_caller_role
        FROM public.user_profiles
        WHERE id = v_user_id;

        IF v_caller_role NOT IN ('admin', 'super_admin') THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;

    ELSIF p_is_merchant THEN
        -- Merchant must own the order
        IF v_order.merchant_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.merchants
                WHERE id = v_order.merchant_id AND user_id = v_user_id
            ) THEN
                RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
            END IF;
        END IF;

    ELSIF p_is_customer THEN
        IF v_order.customer_id != v_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;

    ELSE
        RETURN json_build_object('success', false, 'message', 'Unauthorized: Missing role flag');
    END IF;

    -- Apply update
    UPDATE public.shopping_order_groups
    SET delivery_status      = p_new_status,
        tracking_number      = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes         = p_status_notes,
        updated_at           = NOW()
    WHERE id = p_order_id;

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
