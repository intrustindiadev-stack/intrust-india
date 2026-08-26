-- ============================================================
-- Migration: 20260825000000_fix_cart_idor_and_grant_lockdown
--
-- Problem:
--   add_to_shopping_cart (3-arg and 5-arg) and customer_checkout_v4
--   are SECURITY DEFINER functions that accept a caller-supplied
--   p_customer_id with no auth.uid() validation.
--   This is an IDOR vulnerability: an authenticated user can write
--   to or read from any other user's cart/wallet by passing a
--   different UUID.
--
--   Additionally, all three functions are granted to PUBLIC and anon,
--   meaning unauthenticated callers can invoke them.
--
-- Fix:
--   - For authenticated callers: derive v_customer_id from auth.uid(),
--     ignore p_customer_id. Matches the draft_cart_orders P7 fix pattern.
--   - For service_role callers (auth.uid() IS NULL inside SECURITY DEFINER):
--     trust p_customer_id. This allows the server-side wallet-checkout
--     route to pass userId after its own JWT verification.
--   - For unauthenticated callers (auth.uid() IS NULL AND no service_role):
--     raise an exception.
--   - Revoke EXECUTE from PUBLIC and anon for all three functions.
--
-- Callers:
--   add_to_shopping_cart (5-arg):
--     StorefrontV2Client.jsx, ProductDetailClient.jsx, WishlistClient.jsx
--   add_to_shopping_cart (3-arg):
--     No current frontend callers (legacy overload, kept for safety)
--   customer_checkout_v4 (1-arg):
--     app/api/shopping/wallet-checkout/route.js (server-side, service_role)
--
-- Date: 2026-08-25
-- ============================================================

BEGIN;

-- ── 1. add_to_shopping_cart (5-arg) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.add_to_shopping_cart(
    p_customer_id  UUID,
    p_inventory_id UUID,
    p_product_id   UUID,
    p_quantity     INTEGER,
    p_is_platform  BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_uid           UUID;
    v_customer_id          UUID;
    v_product_id           UUID := p_product_id;
    v_existing_id          UUID;
    v_cart_count           INTEGER;
    v_existing_is_platform BOOLEAN;
    v_existing_merchant_id UUID;
    v_new_merchant_id      UUID;
BEGIN
    -- AUTHORIZATION: derive caller identity from auth.uid() -----------------
    -- For authenticated browser callers: always use auth.uid().
    -- This prevents IDOR: a browser cannot operate on another user's cart
    -- by supplying a different UUID.
    -- For service_role server-side calls: auth.uid() is NULL inside
    -- SECURITY DEFINER, so fall back to caller-supplied p_customer_id
    -- (the server route has already verified the user via JWT).
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NULL THEN
        -- Service-role or internal call: trust p_customer_id.
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Not authenticated and no customer ID provided.';
        END IF;
        v_customer_id := p_customer_id;
    ELSE
        -- Authenticated browser user: always use auth.uid(), ignore p_customer_id.
        v_customer_id := v_caller_uid;
    END IF;

    -- 1. Get the merchant ID of the item being added
    IF NOT p_is_platform THEN
        IF p_inventory_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Inventory ID required for merchant items');
        END IF;
        SELECT merchant_id, product_id INTO v_new_merchant_id, v_product_id
        FROM public.merchant_inventory
        WHERE id = p_inventory_id;
        IF v_product_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Inventory item not found');
        END IF;
    ELSE
        IF v_product_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Product ID required for platform items');
        END IF;
    END IF;

    -- 2. Check for mixed merchant conflict
    SELECT COUNT(*), COALESCE(MAX(is_platform_item::int)::boolean, false)
    INTO v_cart_count, v_existing_is_platform
    FROM public.shopping_cart
    WHERE customer_id = v_customer_id;

    IF v_cart_count > 0 THEN
        IF p_is_platform <> v_existing_is_platform THEN
            RETURN jsonb_build_object('success', false, 'message', 'MIXED_SELLER_ERROR', 'seller_type_conflict', true);
        END IF;

        IF NOT p_is_platform THEN
            SELECT DISTINCT mi.merchant_id INTO v_existing_merchant_id
            FROM public.shopping_cart sc
            JOIN public.merchant_inventory mi ON sc.inventory_id = mi.id
            WHERE sc.customer_id = v_customer_id
            LIMIT 1;

            IF v_existing_merchant_id IS NOT NULL AND v_existing_merchant_id <> v_new_merchant_id THEN
                RETURN jsonb_build_object('success', false, 'message', 'MIXED_SELLER_ERROR', 'merchant_conflict', true);
            END IF;
        END IF;
    END IF;

    -- 3. Check if item already exists in cart for this customer
    SELECT id INTO v_existing_id
    FROM public.shopping_cart
    WHERE customer_id = v_customer_id
      AND (inventory_id IS NOT DISTINCT FROM p_inventory_id)
      AND product_id = v_product_id
      AND is_platform_item = p_is_platform;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.shopping_cart
        SET quantity = quantity + p_quantity,
            updated_at = now()
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.shopping_cart (customer_id, inventory_id, product_id, quantity, is_platform_item)
        VALUES (v_customer_id, p_inventory_id, v_product_id, p_quantity, p_is_platform);
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- ── 2. add_to_shopping_cart (3-arg legacy) ─────────────────────────────────
-- Not called by any current frontend code, but kept to avoid breaking
-- any undiscovered legacy paths. Security model is identical to the 5-arg.

CREATE OR REPLACE FUNCTION public.add_to_shopping_cart(
    p_customer_id  UUID,
    p_inventory_id UUID,
    p_quantity     INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_uid  UUID;
    v_customer_id UUID;
    v_product_id  UUID;
    v_existing_id UUID;
BEGIN
    -- AUTHORIZATION: derive caller identity from auth.uid() -----------------
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NULL THEN
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Not authenticated and no customer ID provided.';
        END IF;
        v_customer_id := p_customer_id;
    ELSE
        v_customer_id := v_caller_uid;
    END IF;

    -- Get product_id from inventory record
    SELECT product_id INTO v_product_id
    FROM public.merchant_inventory
    WHERE id = p_inventory_id;

    IF v_product_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Inventory item not found');
    END IF;

    -- Check if item already exists in cart for this customer
    SELECT id INTO v_existing_id
    FROM public.shopping_cart
    WHERE customer_id = v_customer_id AND inventory_id = p_inventory_id;

    IF v_existing_id IS NOT NULL THEN
        UPDATE public.shopping_cart
        SET quantity = quantity + p_quantity,
            updated_at = now()
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO public.shopping_cart (customer_id, inventory_id, product_id, quantity)
        VALUES (v_customer_id, p_inventory_id, v_product_id, p_quantity);
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- ── 3. customer_checkout_v4 ────────────────────────────────────────────────
-- Called server-side only (wallet-checkout/route.js via service_role admin).
-- The auth.uid() override prevents direct REST exploitation by browser clients.
-- service_role calls pass a server-verified userId, which is trusted.

CREATE OR REPLACE FUNCTION public.customer_checkout_v4(p_customer_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_caller_uid          UUID;
    v_customer_id         UUID;
    v_wallet_balance      BIGINT;
    v_total_paise         BIGINT := 0;
    v_cart_items          RECORD;
    v_group_id            UUID;
    v_merchant_id         UUID;
    v_is_platform         BOOLEAN;
    v_delivery_address    TEXT;
    v_customer_name       TEXT;
    v_customer_phone      TEXT;
    v_item_total          BIGINT;
    v_product_cost        BIGINT;
    v_commission_paise    BIGINT;
    v_total_platform_cut  BIGINT := 0;
    v_delivery_fee_paise  BIGINT;
    v_item                RECORD;
BEGIN
    -- AUTHORIZATION: derive caller identity from auth.uid() -----------------
    -- For authenticated browser callers: always use auth.uid() to prevent IDOR.
    -- For service_role calls (auth.uid() IS NULL): trust p_customer_id.
    -- The wallet-checkout server route validates the JWT before calling this.
    v_caller_uid := auth.uid();

    IF v_caller_uid IS NULL THEN
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Caller identity could not be determined.';
        END IF;
        v_customer_id := p_customer_id;
    ELSE
        v_customer_id := v_caller_uid;
    END IF;

    SELECT balance_paise INTO v_wallet_balance
    FROM public.customer_wallets
    WHERE user_id = v_customer_id;

    IF v_wallet_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    SELECT full_name, phone, address
    INTO v_customer_name, v_customer_phone, v_delivery_address
    FROM public.user_profiles
    WHERE id = v_customer_id;

    IF v_delivery_address IS NULL OR v_delivery_address = '' THEN
        SELECT full_address INTO v_delivery_address
        FROM public.kyc_records
        WHERE user_id = v_customer_id;
    END IF;

    SELECT is_platform_item INTO v_is_platform
    FROM public.shopping_cart
    WHERE customer_id = v_customer_id
    LIMIT 1;

    IF v_is_platform IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cart is empty');
    END IF;

    IF NOT v_is_platform THEN
        SELECT mi.merchant_id INTO v_merchant_id
        FROM public.shopping_cart sc
        JOIN public.merchant_inventory mi ON sc.inventory_id = mi.id
        WHERE sc.customer_id = v_customer_id
        LIMIT 1;
    END IF;

    SELECT COALESCE(value::BIGINT, 9900) INTO v_delivery_fee_paise
    FROM public.platform_settings
    WHERE key = 'delivery_fee_paise';

    IF v_delivery_fee_paise IS NULL THEN
        v_delivery_fee_paise := 9900;
    END IF;

    -- Totalling loop: validate stock + compute total
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
        WHERE c.customer_id = v_customer_id
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

    -- status = 'completed' because wallet orders are pre-paid
    INSERT INTO public.shopping_order_groups (
        customer_id, customer_name, customer_phone,
        total_amount_paise, status, payment_status, delivery_status,
        merchant_id, is_platform_order, delivery_address,
        delivery_fee_paise, payment_method, settlement_status
    )
    VALUES (
        v_customer_id, v_customer_name, v_customer_phone,
        v_total_paise, 'completed', 'paid', 'pending',
        v_merchant_id, v_is_platform, v_delivery_address,
        v_delivery_fee_paise, 'wallet',
        'pending'
    )
    RETURNING id INTO v_group_id;

    -- Item processing loop
    FOR v_item IN
        SELECT
            c.*,
            CASE WHEN c.is_platform_item
                 THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise)
            END                    AS effective_price,
            mi.merchant_id,
            mi.id                  AS inventory_id,
            p.wholesale_price_paise AS platform_cost,
            p.gst_percentage       AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products      p  ON c.product_id  = p.id
        WHERE c.customer_id = v_customer_id
    LOOP
        v_item_total := v_item.effective_price * v_item.quantity;

        IF v_item.is_platform_item AND v_item.merchant_id IS NULL THEN
            -- Platform direct item
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
    WHERE user_id = v_customer_id;

    INSERT INTO public.customer_wallet_transactions (
        wallet_id, user_id, type, amount_paise,
        balance_before_paise, balance_after_paise, description
    ) VALUES (
        (SELECT id FROM public.customer_wallets WHERE user_id = v_customer_id),
        v_customer_id, 'DEBIT', v_total_paise,
        v_wallet_balance, v_wallet_balance - v_total_paise,
        'Shopping Purchase: Order Group ' || v_group_id
    );

    DELETE FROM public.shopping_cart WHERE customer_id = v_customer_id;

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id);
END;
$$;


-- ── 4. Grant lockdown: revoke PUBLIC / anon EXECUTE ────────────────────────

-- add_to_shopping_cart (3-arg)
REVOKE EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, integer) FROM anon;
GRANT  EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, integer) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, integer) TO service_role;

-- add_to_shopping_cart (5-arg)
REVOKE EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, integer, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, integer, boolean) FROM anon;
GRANT  EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, integer, boolean) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.add_to_shopping_cart(uuid, uuid, uuid, integer, boolean) TO service_role;

-- customer_checkout_v4
REVOKE EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) TO service_role;


DO $$
BEGIN
    RAISE NOTICE 'IDOR fix applied to add_to_shopping_cart (3-arg), add_to_shopping_cart (5-arg), customer_checkout_v4.';
    RAISE NOTICE 'anon and PUBLIC EXECUTE revoked from all three functions.';
END;
$$;

COMMIT;
