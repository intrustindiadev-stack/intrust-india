-- Migration: 20260924000002_fix_duplicate_orders_and_admin_draft_filtering.sql
-- Description:
-- 1. One-time cleanup: mark abandoned/unpaid gateway drafts as cancelled/failed so they don't linger.
-- 2. Update customer_checkout_v4: automatically cancel prior pending gateway drafts when checking out with wallet.
-- 3. Update admin_get_all_orders: filter out unpaid gateway payment drafts (payment_method='gateway' AND payment_status != 'paid')
--    so admin orders list only shows real confirmed orders, and return payment_method / payment_status / status.
-- 4. Update admin_get_order_detail: return payment_method / payment_status / status.

-- ── 1. One-time cleanup of abandoned gateway draft orders ───────────────────
UPDATE public.shopping_order_groups
SET status = 'cancelled',
    delivery_status = 'cancelled',
    payment_status = 'failed'
WHERE payment_method = 'gateway'
  AND payment_status = 'pending'
  AND status = 'pending';

-- ── 2. Update customer_checkout_v4 ──────────────────────────────────────────
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
    v_delivery_fee_paise BIGINT;
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

    -- Fetch delivery fee dynamically from platform_settings
    SELECT COALESCE(value::BIGINT, 9900) INTO v_delivery_fee_paise
    FROM public.platform_settings
    WHERE key = 'delivery_fee_paise';

    IF v_delivery_fee_paise IS NULL THEN
        v_delivery_fee_paise := 9900;
    END IF;

    -- ── Totalling loop: validate stock + compute total ───────────────
    FOR v_cart_items IN
        SELECT
            c.*,
            CASE WHEN c.is_platform_item
                 THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise)
            END                    AS effective_price,
            mi.stock_quantity      AS merchant_stock,
            p.admin_stock          AS platform_stock,
            p.title                AS product_title,
            p.gst_percentage       AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products      p  ON c.product_id  = p.id
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

    -- Cancel any previous pending gateway drafts for this user (prevent duplicate/orphaned drafts)
    UPDATE public.shopping_order_groups
    SET status = 'cancelled',
        delivery_status = 'cancelled',
        payment_status = 'failed'
    WHERE customer_id = p_customer_id
      AND status = 'pending'
      AND payment_method = 'gateway';

    -- Defer settlement: settlement_status stays 'pending'
    -- status = 'completed' because wallet orders are pre-paid
    INSERT INTO public.shopping_order_groups (
        customer_id, customer_name, customer_phone,
        total_amount_paise, status, payment_status, delivery_status,
        merchant_id, is_platform_order, delivery_address,
        delivery_fee_paise, payment_method, settlement_status
    )
    VALUES (
        p_customer_id, v_customer_name, v_customer_phone,
        v_total_paise, 'completed', 'paid', 'pending',
        v_merchant_id, v_is_platform, v_delivery_address,
        v_delivery_fee_paise, 'wallet',
        'pending'
    )
    RETURNING id INTO v_group_id;

    -- ── Item-processing loop: deduct stock + insert order items ──────
    FOR v_item IN
        SELECT
            c.*,
            CASE WHEN c.is_platform_item
                 THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise)
            END                    AS effective_price,
            mi.merchant_id,
            p.wholesale_price_paise AS platform_cost,
            p.gst_percentage        AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products      p  ON c.product_id  = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        v_item_total := v_item.effective_price * v_item.quantity;

        IF v_item.is_platform_item THEN
            UPDATE public.shopping_products
            SET admin_stock = admin_stock - v_item.quantity, updated_at = now()
            WHERE id = v_item.product_id;

            -- auto-delist when stock reaches zero after this sale
            UPDATE public.shopping_products
            SET platform_listed = false
            WHERE id = v_item.product_id
              AND admin_stock = 0;

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

            INSERT INTO public.notifications (
                user_id, title, body, type, reference_id, reference_type
            )
            SELECT user_id, 'New Order Received 🛒',
                   'A customer placed an order. Check your orders page.',
                   'success', v_group_id, 'shopping_order'
            FROM public.merchants WHERE id = v_item.merchant_id;
        END IF;
    END LOOP;

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

-- ── 3. Update admin_get_all_orders ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_all_orders(p_limit integer DEFAULT 200, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_caller_role TEXT;
    v_orders JSONB;
    v_total INTEGER;
BEGIN
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = auth.uid();

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    -- Total count of REAL orders (excluding abandoned/unpaid gateway drafts)
    SELECT COUNT(*) INTO v_total
    FROM public.shopping_order_groups og
    WHERE NOT (og.payment_method = 'gateway' AND og.payment_status != 'paid');

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
            og.payment_method,
            og.payment_status,
            og.status,
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
        WHERE NOT (og.payment_method = 'gateway' AND og.payment_status != 'paid')
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
$function$;

-- ── 4. Update admin_get_order_detail ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_order_detail(p_order_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order json;
    v_admin_role text;
BEGIN
    SELECT role INTO v_admin_role FROM public.user_profiles WHERE id = auth.uid();

    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT jsonb_build_object(
        'id', og.id,
        'customer_id', og.customer_id,
        'merchant_id', og.merchant_id,
        'delivery_status', og.delivery_status,
        'tracking_number', og.tracking_number,
        'estimated_delivery_at', og.estimated_delivery_at,
        'status_notes', og.status_notes,
        'total_amount_paise', og.total_amount_paise,
        'delivery_fee_paise', og.delivery_fee_paise,
        'delivery_address', og.delivery_address,
        'contact_phone', og.customer_phone,
        'is_platform_order', og.is_platform_order,
        'payment_method', og.payment_method,
        'payment_status', og.payment_status,
        'status', og.status,
        'created_at', og.created_at,
        'updated_at', og.updated_at,
        'customer_name', p.full_name,
        'customer_phone', p.phone,
        'merchant_name', m.business_name,
        'merchant_phone', m.business_phone,
        'commission_rate', og.commission_rate,
        'platform_cut_paise', og.platform_cut_paise,
        'merchant_profit_paise', og.merchant_profit_paise,
        'settlement_status', og.settlement_status,
        'assigned_to', og.assigned_to,
        'admin_takeover_at', og.admin_takeover_at,
        'items', (
            SELECT json_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'product_id', oi.product_id,
                    'product_title', pr.title,
                    'quantity', oi.quantity,
                    'unit_price_paise', oi.unit_price_paise,
                    'total_price_paise', (oi.unit_price_paise * oi.quantity),
                    'profit_paise', oi.profit_paise,
                    'product_image', pr.product_images[1],
                    'hsn_code', pr.hsn_code,
                    'gst_percentage', pr.gst_percentage,
                    'cost_price_paise', oi.cost_price_paise
                )
            )
            FROM public.shopping_order_items oi
            LEFT JOIN public.shopping_products pr ON oi.product_id = pr.id
            WHERE oi.group_id = og.id
        )
    ) INTO v_order
    FROM public.shopping_order_groups og
    LEFT JOIN public.user_profiles p ON og.customer_id = p.id
    LEFT JOIN public.merchants m ON og.merchant_id = m.id
    WHERE og.id = p_order_id;

    IF v_order IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    RETURN json_build_object('success', true, 'order', v_order);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- ── 5. Grants and Security ──────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.admin_get_all_orders(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_all_orders(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_all_orders(integer, integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_order_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_get_order_detail(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_order_detail(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) TO service_role;
