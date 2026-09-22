-- =============================================================================
-- MIGRATION: 20260919_wholesale_wallet_internal_bypass.sql
-- Created: 2026-09-19
--
-- PURPOSE
--   Fixes the Merchant Panel "Pay via Wallet" checkout failure:
--       Column wallet_balance_paise is protected and cannot be updated directly.
--
-- REPORTED FLOW (traced end-to-end)
--   components/merchant/shopping/MerchantFloatingCart.jsx:216  ("Pay via Wallet")
--     → onPurchaseWallet  (prop, wired at WholesaleClient.jsx:876)
--     → WholesaleClient.jsx:314  handlePurchaseWallet()
--     → supabase.rpc('purchase_platform_products_bulk', { p_items, p_merchant_id })
--         (browser anon-key client — lib/supabaseClient.js)
--
--   The frontend payload is already clean — it sends ONLY the item list and the
--   merchant id (WholesaleClient.jsx:323-331). No wallet math leaves the client,
--   and no generic `.update({ wallet_balance_paise })` exists anywhere in app/,
--   components/, hooks/ or lib/. The failure is entirely server-side.
--
-- ROOT CAUSE
--   purchase_platform_products_bulk() is SECURITY DEFINER, owned by `postgres`,
--   and performs a direct, atomic deduction of the protected financial column
--   `merchants.wallet_balance_paise` (final "Balance Sync" UPDATE).
--
--   The RPC never sets the internal bypass flag that the column guard honours:
--       public.merchants_block_sensitive_column_updates()
--       → IF current_setting('app.internal_bypass', true) = 'true' THEN RETURN NEW;
--
--   The original deployment (20260424_fix_purchase_security_bypass.sql:104) DID
--   contain `PERFORM set_config('app.internal_bypass', 'true', true)` at entry.
--   The bypass was lost when the function was later re-created from
--   supabase/operational-sql/ variants (fix_wholesale_gst.sql, batch_id revision)
--   that dropped the set_config call. Verified against production:
--       → 0 occurrences of 'internal_bypass' in the live function body
--       → live body also lacks SET search_path and the GST/batch_id logic
--         (those local copies were never applied to prod)
--
--   Why the 2026-09-18 guard fix did not mask this:
--   the guard bypasses for role='service_role' OR session_user IN
--   ('postgres','supabase_admin'). A merchant calling this RPC arrives over
--   PostgREST as session_user='authenticator' with SET LOCAL ROLE authenticated.
--   The guard is deliberately SECURITY INVOKER and keys off `session_user`
--   precisely so DEFINER-owned business RPCs are NOT implicitly trusted and must
--   opt in explicitly via app.internal_bypass. This RPC therefore fails at:
--       RAISE EXCEPTION 'Column wallet_balance_paise is protected and cannot be
--                        updated directly.';   (guard line 126)
--
--   Correct-pattern precedents that DO set the flag (all postgres-owned DEFINER
--   RPCs): customer_checkout_v4, perform_wallet_adjustment,
--   purchase_platform_products (single-item sibling, 20260424:23),
--   procure_from_merchant, request_store_credit_for_cart,
--   settle_store_credit_for_cart.
--
-- WHAT THIS MIGRATION CHANGES
--   Re-creates public.purchase_platform_products_bulk(jsonb[], uuid) with the
--   EXACT live production shape (body captured via pg_get_functiondef) plus two
--   additions:
--     1. PERFORM set_config('app.internal_bypass', 'true', true) right after
--        BEGIN — the flag is transaction-local (is_local=true) and is explicitly
--        reset to 'false' on every early RETURN and in an EXCEPTION arm, so it
--        can never leak into later statements of the caller's transaction.
--     2. SET search_path = public on the DEFINER function (hardening; all
--        relations are already schema-qualified so behaviour is unchanged, and
--        it matches the original 20260424 deployment which had it).
--
--   No other logic is touched: identity check (auth.uid() vs merchant.user_id),
--   stock validation, FOR UPDATE row locks, per-item merchant_transactions
--   ledger rows, shopping_orders rows, admin_stock decrement and the
--   merchant_inventory upsert all stay identical.
--
-- ⚠ NOT DONE HERE (deliberate, to avoid an unreviewed behaviour change)
--   Production's version predates the GST-inclusive pricing, purchase_batch_id
--   and in-app notification work that exists only in local
--   supabase/operational-sql/* copies — and those files carry no set_config
--   either, so re-applying them would REINTRODUCE this exact bug. Promoting prod
--   to the GST/batch-id version is a pricing/product decision and must be a
--   separate reviewed migration that ALSO carries the bypass flag.
--
-- Idempotent: CREATE OR REPLACE FUNCTION only.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.purchase_platform_products_bulk(
    p_items jsonb[],
    p_merchant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_item_price BIGINT;
    v_total_cost BIGINT := 0;
    v_merchant_balance BIGINT;
    v_new_balance BIGINT;
    v_product RECORD;
BEGIN
    -- ── Internal bypass ──────────────────────────────────────────────────────
    -- This RPC is the sanctioned, atomic wallet-deduction path for wholesale
    -- purchases. It must opt in to the guard bypass explicitly, because the
    -- guard is SECURITY INVOKER and keys off session_user (see header).
    -- is_local = true → the flag is discarded at transaction end; it is also
    -- reset explicitly on every exit path below.
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- 0. Identity Validation
    IF NOT EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    -- 1. Pre-validation loop: Check all stocks and calculate total cost
    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
        END IF;

        SELECT wholesale_price_paise, admin_stock, title INTO v_product
        FROM public.shopping_products WHERE id = v_product_id;

        IF v_product.admin_stock < v_qty THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock for ' || v_product.title);
        END IF;

        v_total_cost := v_total_cost + (v_product.wholesale_price_paise * v_qty);
    END LOOP;

    -- 2. Check and lock merchant balance
    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    -- 3. Execute updates in a single loop
    v_new_balance := v_merchant_balance;

    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT wholesale_price_paise INTO v_item_price
        FROM public.shopping_products WHERE id = v_product_id FOR UPDATE;

        -- Update Stock
        UPDATE public.shopping_products SET admin_stock = admin_stock - v_qty WHERE id = v_product_id;

        -- Add to Inventory
        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise,
            is_platform_product, is_active, custom_title, custom_description
        )
        SELECT
            p_merchant_id, v_product_id, v_qty, suggested_retail_price_paise,
            true, false, title, description
        FROM public.shopping_products WHERE id = v_product_id
        ON CONFLICT (merchant_id, product_id) DO UPDATE
        SET stock_quantity = merchant_inventory.stock_quantity + v_qty;

        -- Log Order
        INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
        VALUES (p_merchant_id, 'merchant', NULL, 'admin', v_product_id, v_qty, v_item_price, v_item_price * v_qty, 'wholesale');

        -- Update local tracking for ledger
        v_new_balance := v_new_balance - (v_item_price * v_qty);

        -- Log Transaction
        INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
        VALUES (p_merchant_id, 'purchase', -(v_item_price * v_qty), v_new_balance, 'Wholesale bulk purchase', jsonb_build_object('product_id', v_product_id, 'quantity', v_qty));
    END LOOP;

    -- Final Balance Sync
    UPDATE public.merchants SET wallet_balance_paise = v_new_balance WHERE id = p_merchant_id;

    -- Reset the bypass before the success RETURN so the flag cannot leak into
    -- any statement the caller may still run inside this same transaction.
    PERFORM set_config('app.internal_bypass', 'false', true);

    RETURN jsonb_build_object('success', true, 'message', 'Bulk purchase successful');

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$function$;


-- Grant matrix preserved exactly as on production (verified via pg_proc.proacl):
--   {=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres,anon=X/postgres}
GRANT EXECUTE ON FUNCTION public.purchase_platform_products_bulk(JSONB[], UUID) TO authenticated, service_role;

-- =============================================================================
-- VERIFICATION 1 — the guard bypass is present in the new function body
-- =============================================================================
DO $verify$
DECLARE
    v_def  text;
    v_hits int;
BEGIN
    SELECT pg_get_functiondef(p.oid) INTO v_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'purchase_platform_products_bulk';

    IF v_def IS NULL THEN
        RAISE EXCEPTION 'purchase_platform_products_bulk was not created';
    END IF;

    IF v_def NOT ILIKE '%SECURITY DEFINER%' THEN
        RAISE EXCEPTION 'purchase_platform_products_bulk must stay SECURITY DEFINER';
    END IF;

    -- count the set_config calls we expect:
    --   1 open + 4 early-return resets + 1 success reset + 1 exception reset = 7
    v_hits := (SELECT count(*) FROM regexp_matches(v_def, 'app\.internal_bypass', 'g'));

    IF v_hits IS NULL OR v_hits < 7 THEN
        RAISE EXCEPTION 'internal bypass flags missing from purchase_platform_products_bulk (found %, expected >= 6)', v_hits;
    END IF;

    IF v_def NOT ILIKE '%set search_path%' THEN
        RAISE EXCEPTION 'SECURITY DEFINER function must pin search_path = public';
    END IF;

    IF v_def NOT ILIKE '%wallet_balance_paise = v_new_balance%' THEN
        RAISE EXCEPTION 'balance sync statement missing';
    END IF;

    RAISE NOTICE 'purchase_platform_products_bulk: internal bypass present (% flags, SECURITY DEFINER, search_path pinned)', v_hits;
END
$verify$;

-- =============================================================================
-- VERIFICATION 2 — every column the function touches still exists
-- (plpgsql resolves record/row fields lazily at first execution, so a typo'd
--  or renamed column would otherwise only explode in production checkout)
-- =============================================================================
DO $verify_columns$
DECLARE
    v_required text[] := ARRAY[
        'merchants.wallet_balance_paise',
        'merchants.id',
        'merchants.user_id',
        'shopping_products.wholesale_price_paise',
        'shopping_products.admin_stock',
        'shopping_products.title',
        'shopping_products.suggested_retail_price_paise',
        'shopping_products.description',
        'shopping_products.id',
        'merchant_inventory.merchant_id',
        'merchant_inventory.product_id',
        'merchant_inventory.stock_quantity',
        'merchant_inventory.retail_price_paise',
        'merchant_inventory.is_platform_product',
        'merchant_inventory.is_active',
        'merchant_inventory.custom_title',
        'merchant_inventory.custom_description',
        'shopping_orders.buyer_id',
        'shopping_orders.buyer_type',
        'shopping_orders.seller_id',
        'shopping_orders.seller_type',
        'shopping_orders.product_id',
        'shopping_orders.quantity',
        'shopping_orders.unit_price_paise',
        'shopping_orders.total_price_paise',
        'shopping_orders.order_type',
        'merchant_transactions.merchant_id',
        'merchant_transactions.transaction_type',
        'merchant_transactions.amount_paise',
        'merchant_transactions.balance_after_paise',
        'merchant_transactions.description',
        'merchant_transactions.metadata'
    ];
    v_missing text[];
    r record;
BEGIN
    FOR r IN SELECT unnest(v_required) AS ref LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = split_part(r.ref, '.', 1)
              AND column_name = split_part(r.ref, '.', 2)
        ) THEN
            v_missing := coalesce(v_missing || r.ref, ARRAY[r.ref]);
        END IF;
    END LOOP;

    IF v_missing IS NOT NULL THEN
        RAISE EXCEPTION 'purchase_platform_products_bulk references non-existent columns: %', array_to_string(v_missing, ', ');
    END IF;

    RAISE NOTICE 'column set verified (% refs)', array_length(v_required, 1);
END
$verify_columns$;

COMMIT;

-- =============================================================================
-- POST-APPLY VERIFICATION (run manually, all wrapped in ROLLBACK)
-- =============================================================================
-- 1. Guard bypass is live:
--      SELECT l FROM regexp_split_to_table(
--        (SELECT pg_get_functiondef(oid) FROM pg_proc
--          WHERE proname = 'purchase_platform_products_bulk'), E'\n') l
--       WHERE l ILIKE '%internal_bypass%';
--      -- must return at least 6 lines
--
-- 2. Successful merchant checkout path (as PostgREST would run it):
--      BEGIN;
--      SET SESSION AUTHORIZATION authenticator;
--      SET LOCAL ROLE authenticated;
--      SET LOCAL request.jwt.claims =
--        '{"sub":"<merchant user_id>","role":"authenticated"}';
--      SELECT public.purchase_platform_products_bulk(
--        ARRAY['{"product_id":"<real product id>","quantity":1}']::jsonb[],
--        '<merchant id>');
--      -- EXPECT: {"success": true, "message": "Bulk purchase successful"}
--      ROLLBACK;
--
-- 3. Tampered merchant id must still be rejected (guard regression check):
--      BEGIN;
--      SET SESSION AUTHORIZATION authenticator;
--      SET LOCAL ROLE authenticated;
--      SET LOCAL request.jwt.claims = '{"sub":"<merchant user_id>","role":"authenticated"}';
--      SELECT public.purchase_platform_products_bulk(
--        ARRAY['{"product_id":"<real product id>","quantity":1}']::jsonb[],
--        '<some OTHER merchant id>');
--      -- EXPECT: {"success": false, "message": "Unauthorized: Merchant identity mismatch"}
--      ROLLBACK;
--
-- 4. Insufficient balance must still be rejected and must NOT touch the wallet:
--      BEGIN;
--      SET SESSION AUTHORIZATION authenticator;
--      SET LOCAL ROLE authenticated;
--      SET LOCAL request.jwt.claims = '{"sub":"<merchant user_id>","role":"authenticated"}';
--      SELECT public.purchase_platform_products_bulk(
--        ARRAY['{"product_id":"<real product id>","quantity":999999999}']::jsonb[],
--        '<merchant id>');
--      -- EXPECT: {"success": false, "message": "Insufficient merchant balance"}
--      ROLLBACK;
-- =============================================================================

