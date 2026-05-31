-- ============================================================
-- 20260531_procure_from_merchant_rpc.sql
-- ============================================================
-- Purpose:
--   A. Extend merchant_transactions.transaction_type CHECK
--      constraint to include 'sale_earnings'.
--   B. Create procure_from_merchant RPC — admin-only, atomic,
--      idempotent wholesale procurement that:
--        · Debits merchant_inventory stock
--        · Credits admin_stock on shopping_products
--        · Credits merchant wallet (sale_earnings)
--        · Inserts platform_ledger (wholesale_procurement)
--        · Records procurement order + items for audit
--        · Inserts in-app notification to the merchant
--
--   This migration MUST run after:
--     20260531_procurement_schema.sql
--   (which creates platform_procurement_orders/items and the
--    wholesale_procurement ledger enum value)
-- ============================================================

-- ============================================================
-- Section A — Extend merchant_transactions CHECK constraint
-- ============================================================
-- The referral-chain migration (20260505) last set the allowed
-- values. We drop and recreate to add 'sale_earnings' which is
-- needed by the procurement RPC and the customer-sale RPCs that
-- already use it (customer_purchase_from_merchant, customer_bulk_purchase_v2).
DO $$
BEGIN
    ALTER TABLE public.merchant_transactions
        DROP CONSTRAINT IF EXISTS merchant_transactions_transaction_type_check;

    ALTER TABLE public.merchant_transactions
        ADD CONSTRAINT merchant_transactions_transaction_type_check
        CHECK (transaction_type = ANY (ARRAY[
            'purchase', 'sale', 'commission', 'wallet_topup', 'withdrawal',
            'udhari_payment', 'store_credit_payment', 'subscription', 'payout',
            'referral_reward', 'sale_earnings'
        ]::text[]));
END $$;


-- ============================================================
-- Section B — Create procure_from_merchant RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.procure_from_merchant(
    p_merchant_id     uuid,
    p_items           jsonb,  -- [{product_id, merchant_inventory_id, quantity, platform_price_paise}]
    p_idempotency_key uuid
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

    -- money math
    v_cost_paise            bigint;
    v_gst_paise             bigint;
    v_line_total_paise      bigint;
    v_total_cost_paise      bigint  := 0;
    v_total_gst_paise       bigint  := 0;
    v_total_amount_paise    bigint  := 0;

    -- misc
    v_caller_role           text;
    v_merchant_status       text;
    v_merchant_user_id      uuid;
    v_procurement_id        uuid;
    v_ledger_balance        bigint;
    v_item_count            integer := 0;
BEGIN
    -- ── 1. Idempotency check ────────────────────────────────────────
    SELECT id, total_amount_paise, total_gst_paise
    INTO v_procurement_id, v_total_amount_paise, v_total_gst_paise
    FROM public.platform_procurement_orders
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success',             true,
            'idempotent',          true,
            'procurement_id',      v_procurement_id,
            'total_amount_paise',  v_total_amount_paise,
            'total_gst_paise',     v_total_gst_paise
        );
    END IF;

    -- ── 2. Auth check — caller must be admin or super_admin ─────────
    SELECT role INTO v_caller_role
    FROM public.user_profiles
    WHERE id = auth.uid();

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
        UPDATE public.shopping_products
        SET admin_stock           = admin_stock + v_qty,
            platform_listed       = true,
            platform_price_paise  = v_platform_price_paise
        WHERE id = v_product_id;
    END LOOP;

    -- ── 5. Credit merchant wallet (bypass the column-guard trigger) ─
    PERFORM set_config('app.internal_bypass', 'true', true);

    UPDATE public.merchants
    SET wallet_balance_paise = wallet_balance_paise + v_total_amount_paise
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

    -- ── 6. Insert platform_ledger (wholesale_procurement, debit) ────
    SELECT COALESCE(balance_after_paise, 0) INTO v_ledger_balance
    FROM public.platform_ledger
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    INSERT INTO public.platform_ledger (
        transaction_id,
        entry_type,
        amount_paise,
        balance_after_paise,
        description
    ) VALUES (
        NULL,                                        -- no linked transaction_id (same as shopping_commission)
        'wholesale_procurement',
        -v_total_amount_paise,                       -- negative = platform outflow
        v_ledger_balance - v_total_amount_paise,
        'Wholesale procurement from merchant ' || p_merchant_id::text
    );

    -- ── 7. Insert procurement order header ──────────────────────────
    INSERT INTO public.platform_procurement_orders (
        merchant_id,
        created_by_admin,
        status,
        fulfillment_mode,
        total_cost_paise,
        total_gst_paise,
        total_amount_paise,
        idempotency_key
    ) VALUES (
        p_merchant_id,
        auth.uid(),
        'completed',
        'intrust',
        v_total_cost_paise,
        v_total_gst_paise,
        v_total_amount_paise,
        p_idempotency_key
    )
    RETURNING id INTO v_procurement_id;

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
        user_id,
        title,
        body,
        type,
        reference_type,
        reference_id,
        read
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
    RETURN jsonb_build_object(
        'success',             true,
        'idempotent',          false,
        'procurement_id',      v_procurement_id,
        'total_amount_paise',  v_total_amount_paise,
        'total_gst_paise',     v_total_gst_paise
    );

EXCEPTION WHEN OTHERS THEN
    -- Reset bypass flag on error, then re-raise for full rollback
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;


-- ============================================================
-- Permissions — mirror of create_wholesale_draft
-- ============================================================
REVOKE ALL ON FUNCTION public.procure_from_merchant(uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.procure_from_merchant(uuid, jsonb, uuid) TO service_role;


-- ============================================================
-- Verification queries (run after deploy)
-- ============================================================
-- 1. Confirm CHECK constraint now includes 'sale_earnings':
--    SELECT pg_get_constraintdef(oid)
--    FROM pg_constraint
--    WHERE conname = 'merchant_transactions_transaction_type_check';
--
-- 2. Confirm function exists:
--    SELECT proname, prosecdef FROM pg_proc WHERE proname = 'procure_from_merchant';
--
-- 3. Confirm service_role can execute it:
--    SELECT has_function_privilege('service_role', 'procure_from_merchant(uuid,jsonb,uuid)', 'execute');
