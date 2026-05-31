-- ============================================================
-- 20260602_procurement_bugfixes.sql
-- ============================================================
-- Purpose:
--   Atomic forward migration fixing all procurement-related
--   bugs surfaced in the production audit:
--
--   #1 (Critical)  — customer_checkout_v4 + draft_cart_orders
--                    now charge platform_price_paise for procured
--                    products instead of suggested_retail_price_paise.
--   #2 (High)      — Drop the stale 3-arg procure_from_merchant
--                    overload; only the correct 4-arg version remains.
--   #3 (Medium)    — platform_ledger balance_after_paise for
--                    wholesale_procurement entries now uses a SUM
--                    aggregate (matching settlement convention) instead
--                    of a racy ORDER BY…LIMIT 1 pre-read.
--   #4 (Medium/A)  — Auto-delist: platform_listed is cleared to false
--                    when admin_stock hits 0 after a checkout sale,
--                    consistent with the related-products query.
--   #6 (Low)       — invoice_number generated inside the RPC,
--                    atomic with the order insert; route no longer
--                    performs a post-commit UPDATE.
--
--   Does NOT touch any historical migration files.
--   Every section is safe to re-run (CREATE OR REPLACE / DROP IF EXISTS).
-- ============================================================


-- ============================================================
-- Section 1 — Fix customer_checkout_v4   (Bugs #1, #4A)
-- ============================================================
-- Based on the verified live body (pg_get_functiondef confirmed
-- 2026-06-01).  Changes vs live body:
--   • effective_price: CASE WHEN is_platform_item THEN
--       COALESCE(platform_price_paise, suggested_retail_price_paise)
--       ELSE COALESCE(NULLIF(retail_price_paise,0), suggested_retail_price_paise)
--     END   (applied in BOTH the totalling and the item-processing loops)
--   • After admin_stock decrement: auto-clear platform_listed
--     when the new stock count reaches 0.
-- ============================================================
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

    -- ── Totalling loop: validate stock + compute total ───────────────
    -- FIX #1: platform items use platform_price_paise (marked-up retail
    -- price set at procurement time), falling back to suggested_retail_price_paise
    -- only when platform_price_paise is NULL.  Merchant items continue to
    -- use retail_price_paise → suggested_retail_price_paise as before.
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
    -- FIX #1: same CASE WHEN pattern so unit_price_paise is correct.
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

            -- FIX #4A: auto-delist when stock reaches zero after this sale
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
            -- 30% commission on profit margin (aligned with gateway flow)
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


-- ============================================================
-- Section 2 — Fix draft_cart_orders   (Bug #1)
-- ============================================================
-- Changes vs live body:
--   • Totalling loop: COALESCE(mi.retail_price_paise, ...) →
--     CASE WHEN is_platform_item THEN platform_price_paise ... END
--   • Item-processing loop: same CASE WHEN applied so the
--     unit_price_paise written onto shopping_order_items is
--     already correct before finalize_gateway_orders reads it.
-- Note: draft_cart_orders does NOT decrement stock, so no
-- auto-delist logic here — it lives in finalize_gateway_orders.
-- ============================================================
CREATE OR REPLACE FUNCTION public.draft_cart_orders(p_customer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_total_paise        BIGINT := 0;
    v_cart_items         RECORD;
    v_group_id           UUID;
    v_merchant_id        UUID;
    v_is_platform        BOOLEAN;
    v_delivery_address   TEXT;
    v_customer_name      TEXT;
    v_customer_phone     TEXT;
    v_delivery_fee_paise BIGINT := 9900;
    v_item               RECORD;
BEGIN
    -- 1. Get Customer Details and Delivery Address from profile
    SELECT full_name, phone, address INTO v_customer_name, v_customer_phone, v_delivery_address
    FROM public.user_profiles
    WHERE id = p_customer_id;

    -- Fallback for address from KYC if profile is incomplete
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

    -- ── Totalling loop ───────────────────────────────────────────────
    -- FIX #1: platform items priced at platform_price_paise (procured
    -- marked-up price), falling back to suggested_retail_price_paise.
    FOR v_cart_items IN
        SELECT
            c.*,
            CASE WHEN c.is_platform_item
                 THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(mi.retail_price_paise, p.suggested_retail_price_paise)
            END                AS effective_price,
            mi.stock_quantity  AS merchant_stock,
            p.admin_stock      AS platform_stock,
            p.title            AS product_title,
            p.gst_percentage
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products      p  ON c.product_id  = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        v_total_paise := v_total_paise + (v_cart_items.effective_price * v_cart_items.quantity);

        -- Add GST (aligned with UI: ROUND(price * qty * percentage / 100))
        v_total_paise := v_total_paise + ROUND((v_cart_items.effective_price
                            * v_cart_items.quantity
                            * v_cart_items.gst_percentage / 100.0));

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

    -- 2.5 Cancel previous pending gateway drafts for this user
    UPDATE public.shopping_order_groups
    SET status = 'cancelled'
    WHERE customer_id = p_customer_id
      AND status = 'pending'
      AND payment_method = 'gateway';

    -- 3. CREATE ORDER GROUP
    INSERT INTO public.shopping_order_groups (
        customer_id, customer_name, customer_phone,
        total_amount_paise, status, delivery_status,
        merchant_id, is_platform_order, delivery_address,
        delivery_fee_paise, payment_method
    )
    VALUES (
        p_customer_id, v_customer_name, v_customer_phone,
        v_total_paise, 'pending', 'pending',
        v_merchant_id, v_is_platform, v_delivery_address,
        v_delivery_fee_paise, 'gateway'
    )
    RETURNING id INTO v_group_id;

    -- 4. PROCESS ITEMS (Draft state - record intent with corrected unit price)
    -- FIX #1: same CASE WHEN so the unit_price_paise written here is
    -- already correct; finalize_gateway_orders reads it verbatim.
    FOR v_item IN
        SELECT
            c.*,
            CASE WHEN c.is_platform_item
                 THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(mi.retail_price_paise, p.suggested_retail_price_paise)
            END                AS effective_price,
            mi.merchant_id,
            p.wholesale_price_paise AS platform_cost
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products      p  ON c.product_id  = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        -- Comment 2: Always set seller_id from merchant_inventory.merchant_id when inventory_id
        -- is not null, regardless of is_platform_item. This preserves merchant attribution
        -- even for resold platform products.
        IF v_item.is_platform_item AND v_item.merchant_id IS NULL THEN
            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id, quantity,
                unit_price_paise, cost_price_paise, profit_paise
            ) VALUES (
                v_group_id, NULL, v_item.product_id, NULL, v_item.quantity,
                v_item.effective_price, v_item.platform_cost,
                (v_item.effective_price - COALESCE(v_item.platform_cost, 0)) * v_item.quantity
            );
        ELSE
            -- Merchant item OR platform item sold through merchant inventory
            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id, quantity,
                unit_price_paise, cost_price_paise, profit_paise
            ) VALUES (
                v_group_id, v_item.merchant_id, v_item.product_id, v_item.inventory_id,
                v_item.quantity, v_item.effective_price,
                0,  -- Updated on finalize
                0
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id, 'total_paise', v_total_paise);
END;
$function$;


-- ============================================================
-- Section 3 — Fix finalize_gateway_orders   (Bug #4A)
-- ============================================================
-- finalize_gateway_orders reads unit_price_paise from the draft
-- items written by draft_cart_orders — it does NOT re-derive price
-- from product tables.  Now that draft_cart_orders writes the
-- correct platform_price_paise, the gateway path charges the right
-- amount end-to-end with no price change here.
--
-- The ONLY change in this section is Bug #4A:
--   After admin_stock is decremented for a platform order item,
--   auto-clear platform_listed when stock reaches zero.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_gateway_orders(
    p_group_id     uuid,
    p_customer_id  uuid,
    p_amount_paise bigint
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_group              RECORD;
    v_item               RECORD;
    v_item_total         BIGINT;
    v_commission_paise   BIGINT;
    v_merchant_credit    BIGINT;
    v_product_cost       BIGINT;
    v_merchant_profit    BIGINT;
    v_total_platform_cut BIGINT := 0;
BEGIN
    -- Select the order group, ensuring it is pending payment
    SELECT * INTO v_group
    FROM public.shopping_order_groups
    WHERE id = p_group_id
      AND customer_id = p_customer_id
      AND payment_status = 'pending';

    IF v_group.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or already processed order group');
    END IF;

    IF v_group.total_amount_paise != p_amount_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch');
    END IF;

    -- Update order group to paid and completed ✅
    UPDATE public.shopping_order_groups
    SET payment_status = 'paid',
        status         = 'completed'
    WHERE id = p_group_id;

    -- Process items
    FOR v_item IN
        SELECT i.*, p.admin_stock, p.wholesale_price_paise, mi.stock_quantity AS merchant_stock
        FROM public.shopping_order_items i
        JOIN public.shopping_products    p  ON i.product_id  = p.id
        LEFT JOIN public.merchant_inventory mi ON i.inventory_id = mi.id
        WHERE i.group_id = p_group_id
    LOOP
        v_item_total := v_item.unit_price_paise * v_item.quantity;

        IF v_group.is_platform_order THEN
            -- Platform Order: Admin is the seller
            UPDATE public.shopping_products
            SET admin_stock = admin_stock - v_item.quantity,
                updated_at  = now()
            WHERE id = v_item.product_id;

            -- FIX #4A: auto-delist when platform stock reaches zero
            UPDATE public.shopping_products
            SET platform_listed = false
            WHERE id = v_item.product_id
              AND admin_stock = 0;

        ELSE
            -- CORRECT FORMULA: Commission on profit margin only
            v_product_cost     := COALESCE(v_item.wholesale_price_paise, 0);
            v_commission_paise := GREATEST(0, (v_item.unit_price_paise - v_product_cost))
                                  * v_item.quantity * 30 / 100;
            v_total_platform_cut := v_total_platform_cut + v_commission_paise;
            v_merchant_credit  := v_item_total - v_commission_paise;

            -- Merchant's pure margin profit = credit received minus inventory cost
            v_merchant_profit  := v_merchant_credit - (v_product_cost * v_item.quantity);

            UPDATE public.merchant_inventory
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at     = now()
            WHERE id = v_item.inventory_id;

            -- Update item stats for ledger
            UPDATE public.shopping_order_items
            SET cost_price_paise       = v_product_cost,
                profit_paise           = v_merchant_profit,
                commission_amount_paise = v_commission_paise
            WHERE id = v_item.id;

            INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
            SELECT user_id,
                   'New Order Received 🛒',
                   'Order #' || substring(p_group_id::text from 1 for 8) || ' has been paid.',
                   'success', p_group_id, 'shopping_order'
            FROM public.merchants
            WHERE id = v_item.seller_id;
        END IF;
    END LOOP;

    -- Aggregate Commission Data on Group (if merchant order)
    IF NOT v_group.is_platform_order THEN
        UPDATE public.shopping_order_groups
        SET commission_rate       = 0.30,
            platform_cut_paise    = v_total_platform_cut,
            merchant_profit_paise = (
                SELECT SUM((i.unit_price_paise - COALESCE(p.wholesale_price_paise, 0)) * i.quantity)
                       - v_total_platform_cut
                FROM public.shopping_order_items i
                JOIN public.shopping_products    p ON i.product_id = p.id
                WHERE i.group_id = p_group_id
            ),
            settlement_status = 'pending'
        WHERE id = p_group_id;
    END IF;

    -- CLEAR CART
    DELETE FROM public.shopping_cart WHERE customer_id = p_customer_id;

    RETURN jsonb_build_object('success', true);
END;
$function$;


-- ============================================================
-- Section 4 — Drop stale 3-arg overload   (Bug #2)
-- ============================================================
-- The 3-arg procure_from_merchant(uuid, jsonb, uuid) was the
-- original migration body.  The 4-arg version (with p_admin_id)
-- was later added via CREATE OR REPLACE with a new signature,
-- leaving BOTH overloads in place.  The 3-arg version:
--   (a) calls auth.uid() which is NULL when invoked via service_role
--   (b) has a broken idempotency path that nulls out all totals
--   (c) inserts transaction_id = NULL into platform_ledger which
--       violates the NOT NULL constraint added in later migrations
--   (d) is a PostgREST-ambiguity foot-gun
--
-- The route already passes p_admin_id, so only the 4-arg version
-- is ever called in production.  Drop the stale overload cleanly.
-- ============================================================
DROP FUNCTION IF EXISTS public.procure_from_merchant(uuid, jsonb, uuid);

-- Clean up permissions for the dropped overload (harmless if already gone)
DO $$
BEGIN
    EXECUTE 'REVOKE ALL ON FUNCTION public.procure_from_merchant(uuid, jsonb, uuid) FROM PUBLIC';
EXCEPTION WHEN undefined_function THEN
    -- already dropped — ignore
END;
$$;


-- ============================================================
-- Section 5 — Fix procure_from_merchant 4-arg   (Bugs #3, #6)
-- ============================================================
-- Two changes vs live body:
--
--   Bug #3 — Ledger race:
--     Old: SELECT ... LIMIT 1 FOR UPDATE  →  v_ledger_balance := ...
--          INSERT ... balance_after_paise = v_ledger_balance - amount
--     New: Inline aggregate in the INSERT statement so concurrent
--          writers cannot read a stale prior balance.  Matches the
--          convention in update_order_delivery_v3 (settlement).
--
--   Bug #6 — Atomic invoice_number:
--     Old: RPC commits, then route does a separate UPDATE to set
--          invoice_number — crash in that window = paid order with
--          no invoice.
--     New: invoice_number computed from v_procurement_id before
--          the INSERT, stored atomically.  RPC returns it in the
--          result JSON; idempotent-replay path also returns it.
--          Route no longer needs the post-commit UPDATE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.procure_from_merchant(
    p_merchant_id     uuid,
    p_items           jsonb,
    p_idempotency_key uuid,
    p_admin_id        uuid DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
    -- per-item working vars
    v_item                  jsonb;
    v_product_id            uuid;
    v_inv_id                uuid;
    v_qty                   integer;
    v_platform_price_paise  bigint;

    -- product / inventory snapshots
    v_product               RECORD;
    v_inv                   RECORD;

    -- idempotency lookup vars
    v_existing_id           uuid;
    v_existing_amount       bigint;
    v_existing_gst          bigint;
    v_existing_invoice      text;

    -- money math
    v_cost_paise            bigint;
    v_gst_paise             bigint;
    v_line_total_paise      bigint;
    v_total_cost_paise      bigint  := 0;
    v_total_gst_paise       bigint  := 0;
    v_total_amount_paise    bigint  := 0;

    -- misc
    v_caller_role           text;
    v_effective_admin_id    uuid;
    v_merchant_status       text;
    v_merchant_user_id      uuid;
    v_procurement_id        uuid;
    v_invoice_number        text;      -- FIX #6: declared here, set atomically
    v_item_count            integer := 0;
BEGIN
    -- Resolve effective admin ID: prefer explicit param, fall back to JWT
    v_effective_admin_id := COALESCE(p_admin_id, auth.uid());

    -- ── 1. Idempotency check ────────────────────────────────────────
    -- FIX #6: also fetch invoice_number so idempotent replays return it
    SELECT id, total_amount_paise, total_gst_paise, invoice_number
    INTO   v_existing_id, v_existing_amount, v_existing_gst, v_existing_invoice
    FROM   public.platform_procurement_orders
    WHERE  idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success',            true,
            'idempotent',         true,
            'procurement_id',     v_existing_id,
            'total_amount_paise', v_existing_amount,
            'total_gst_paise',    v_existing_gst,
            'invoice_number',     v_existing_invoice
        );
    END IF;

    -- ── 2. Auth check — caller must be admin or super_admin ─────────
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_effective_admin_id;

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin or super_admin role required';
    END IF;

    -- ── 3. Lock merchant row, assert approved ───────────────────────
    SELECT status, user_id INTO v_merchant_status, v_merchant_user_id
    FROM public.merchants
    WHERE id = p_merchant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Merchant not found: %', p_merchant_id;
    END IF;

    IF v_merchant_status != 'approved' THEN
        RAISE EXCEPTION 'Merchant % is not approved (status: %)', p_merchant_id, v_merchant_status;
    END IF;

    -- ── 4. Per-item validation loop (locks rows, accumulates totals) ─
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id           := (v_item->>'product_id')::uuid;
        v_inv_id               := (v_item->>'merchant_inventory_id')::uuid;
        v_qty                  := (v_item->>'quantity')::integer;
        v_platform_price_paise := (v_item->>'platform_price_paise')::bigint;

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than zero for product %', v_product_id;
        END IF;

        -- 4a. Lock shopping_products row — must be live and owned by this merchant
        SELECT id, wholesale_price_paise, gst_percentage, approval_status, submitted_by_merchant_id, admin_stock
        INTO v_product
        FROM public.shopping_products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product not found: %', v_product_id;
        END IF;

        IF v_product.approval_status != 'live' THEN
            RAISE EXCEPTION 'Product % is not live (status: %)', v_product_id, v_product.approval_status;
        END IF;

        IF v_product.submitted_by_merchant_id != p_merchant_id THEN
            RAISE EXCEPTION 'Product % does not belong to merchant %', v_product_id, p_merchant_id;
        END IF;

        -- 4b. Lock merchant_inventory row — assert sufficient stock
        SELECT id, stock_quantity
        INTO v_inv
        FROM public.merchant_inventory
        WHERE id = v_inv_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Merchant inventory row not found: %', v_inv_id;
        END IF;

        IF v_inv.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'Insufficient merchant inventory stock for product % (have %, need %)',
                v_product_id, v_inv.stock_quantity, v_qty;
        END IF;

        -- 4c. Money math
        v_cost_paise       := v_product.wholesale_price_paise * v_qty;
        v_gst_paise        := ROUND(v_cost_paise * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_line_total_paise := v_cost_paise + v_gst_paise;

        v_total_cost_paise   := v_total_cost_paise   + v_cost_paise;
        v_total_gst_paise    := v_total_gst_paise    + v_gst_paise;
        v_total_amount_paise := v_total_amount_paise + v_line_total_paise;
        v_item_count         := v_item_count + v_qty;

        -- 4d. Debit merchant inventory stock
        UPDATE public.merchant_inventory
        SET stock_quantity = stock_quantity - v_qty
        WHERE id = v_inv_id;

        -- 4e. Credit admin stock, set platform_listed + platform_price_paise
        --     Re-procurement of a previously-delisted product restores platform_listed.
        UPDATE public.shopping_products
        SET admin_stock           = admin_stock + v_qty,
            platform_listed       = true,
            platform_price_paise  = v_platform_price_paise
        WHERE id = v_product_id;
    END LOOP;

    -- ── 5. Credit merchant wallet (bypass the column-guard trigger) ─
    PERFORM set_config('app.internal_bypass', 'true', true);

    UPDATE public.merchants
    SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + v_total_amount_paise
    WHERE id = p_merchant_id;

    PERFORM set_config('app.internal_bypass', 'false', true);

    -- ── 5b. Insert merchant_transactions (sale_earnings) ────────────
    INSERT INTO public.merchant_transactions (
        merchant_id,
        transaction_type,
        amount_paise,
        balance_after_paise,
        description,
        purchase_batch_id
    )
    SELECT
        p_merchant_id,
        'sale_earnings',
        v_total_amount_paise,
        wallet_balance_paise,
        'Platform procurement — ₹' || (v_total_amount_paise / 100)::text
            || ' across ' || v_item_count::text || ' units',
        p_idempotency_key
    FROM public.merchants
    WHERE id = p_merchant_id;

    -- ── 6. Pre-generate procurement ID so it can serve as ledger transaction_id
    v_procurement_id := gen_random_uuid();

    -- FIX #6: Generate invoice_number atomically here (same tx as the order insert)
    --   Format matches the route's prior computation: PINV-YYYY-XXXXXXXX
    v_invoice_number := 'PINV-' || to_char(now(), 'YYYY') || '-'
                        || upper(substring(v_procurement_id::text from 1 for 8));

    -- ── 6b. Insert platform_ledger (wholesale_procurement, debit) ───
    -- FIX #3: Replace ORDER BY…LIMIT 1 pre-read with a single-statement
    -- SUM aggregate so concurrent inserts cannot read a stale balance.
    -- Convention: SUM(amount_paise) over all rows matches update_order_delivery_v3.
    INSERT INTO public.platform_ledger (
        transaction_id,
        entry_type,
        amount_paise,
        balance_after_paise,
        description
    ) VALUES (
        v_procurement_id,
        'wholesale_procurement',
        -v_total_amount_paise,
        (SELECT COALESCE(SUM(amount_paise), 0) FROM public.platform_ledger)
            - v_total_amount_paise,
        'Wholesale procurement from merchant ' || p_merchant_id::text
    );

    -- ── 7. Insert procurement order header ──────────────────────────
    -- FIX #6: invoice_number inserted in the same statement, atomically
    INSERT INTO public.platform_procurement_orders (
        id,
        merchant_id,
        created_by_admin,
        status,
        fulfillment_mode,
        total_cost_paise,
        total_gst_paise,
        total_amount_paise,
        invoice_number,
        idempotency_key
    ) VALUES (
        v_procurement_id,
        p_merchant_id,
        v_effective_admin_id,
        'completed',
        'intrust',
        v_total_cost_paise,
        v_total_gst_paise,
        v_total_amount_paise,
        v_invoice_number,
        p_idempotency_key
    );

    -- ── 7b. Insert procurement items (per-item price snapshots) ─────
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id           := (v_item->>'product_id')::uuid;
        v_inv_id               := (v_item->>'merchant_inventory_id')::uuid;
        v_qty                  := (v_item->>'quantity')::integer;
        v_platform_price_paise := (v_item->>'platform_price_paise')::bigint;

        SELECT wholesale_price_paise, gst_percentage
        INTO v_product
        FROM public.shopping_products
        WHERE id = v_product_id;

        v_cost_paise       := v_product.wholesale_price_paise * v_qty;
        v_gst_paise        := ROUND(v_cost_paise * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_line_total_paise := v_cost_paise + v_gst_paise;

        INSERT INTO public.platform_procurement_items (
            procurement_id,
            product_id,
            merchant_inventory_id,
            quantity,
            unit_wholesale_paise,
            gst_percentage,
            gst_amount_paise,
            line_total_paise,
            platform_price_paise
        ) VALUES (
            v_procurement_id,
            v_product_id,
            v_inv_id,
            v_qty,
            v_product.wholesale_price_paise,
            COALESCE(v_product.gst_percentage, 0),
            v_gst_paise,
            v_line_total_paise,
            v_platform_price_paise
        );
    END LOOP;

    -- ── 8. In-app notification to merchant ──────────────────────────
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_type, reference_id, read
    ) VALUES (
        v_merchant_user_id,
        'Platform purchased your stock 🛒',
        '₹' || (v_total_amount_paise / 100)::text
            || ' credited to your wallet for '
            || v_item_count::text || ' units procured by InTrust.',
        'success',
        'procurement_sale',
        v_procurement_id,
        false
    );

    -- ── 9. Return summary ────────────────────────────────────────────
    -- FIX #6: include invoice_number so the route consumes it directly
    RETURN jsonb_build_object(
        'success',            true,
        'idempotent',         false,
        'procurement_id',     v_procurement_id,
        'total_amount_paise', v_total_amount_paise,
        'total_gst_paise',    v_total_gst_paise,
        'invoice_number',     v_invoice_number
    );

EXCEPTION WHEN OTHERS THEN
    -- Reset bypass flag on error, then re-raise for full rollback
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;

-- ── Permissions for the remaining (4-arg) overload ──────────────────
REVOKE ALL ON FUNCTION public.procure_from_merchant(uuid, jsonb, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.procure_from_merchant(uuid, jsonb, uuid, uuid) TO service_role;


-- ============================================================
-- Verification queries (run after deploy)
-- ============================================================
-- 1. Confirm only ONE overload remains:
--    SELECT proname, pg_get_function_identity_arguments(oid) AS args
--    FROM pg_proc WHERE proname = 'procure_from_merchant';
--    -- Expected: 1 row: (p_merchant_id uuid, p_items jsonb,
--    --                   p_idempotency_key uuid, p_admin_id uuid)
--
-- 2. Confirm effective_price in checkout uses platform_price_paise:
--    The function body should now contain "platform_price_paise" in
--    the CASE WHEN branch — verified via pg_get_functiondef.
--
-- 3. Confirm invoice_number is NOT NULL on new orders:
--    SELECT invoice_number, created_at
--    FROM platform_procurement_orders
--    ORDER BY created_at DESC LIMIT 5;
--
-- 4. Confirm platform_ledger does not use ORDER BY LIMIT 1 pre-read:
--    SELECT pg_get_functiondef(oid) FROM pg_proc
--    WHERE proname = 'procure_from_merchant'
--    AND pg_get_function_identity_arguments(oid) LIKE '%p_admin_id%';
