-- ============================================================
-- 20260514_sync_platform_inventory_retail_price.sql
-- ============================================================
-- Purpose:
--   1. Patch the ON CONFLICT clause of the three wholesale/purchase
--      RPCs so that re-stocking also refreshes retail_price_paise
--      (and other columns) in merchant_inventory.
--   2. Add an AFTER UPDATE trigger on shopping_products that
--      propagates suggested_retail_price_paise changes to every
--      is_platform_product = true row in merchant_inventory.
--   3. Run a one-time backfill to immediately heal all rows that
--      are currently drifted.
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1 — Redeploy RPCs with corrected ON CONFLICT clause
-- ============================================================

-- -------------------------------------------------------
-- NOTE on superseded v2 RPCs
-- -------------------------------------------------------
-- The versions of purchase_platform_products and
-- purchase_platform_products_bulk defined in
-- update_merchant_shopping_rpcs_v2.sql are fully superseded:
--   • purchase_platform_products   → by 20260424_fix_purchase_security_bypass.sql
--                                    (adds set_config bypass + SET search_path)
--   • purchase_platform_products_bulk → by fix_wholesale_gst.sql
--                                    (adds GST-inclusive pricing on top)
-- Those v2 variants lack the security bypass and GST logic and
-- are therefore NOT redeployed here.
-- -------------------------------------------------------


-- -------------------------------------------------------
-- 1a. finalize_wholesale_gateway_purchase(UUID, BIGINT)
-- -------------------------------------------------------
-- Source: 20260424_fix_wholesale_draft_expected_amount.sql (lines 12–125)
-- Change: ON CONFLICT block now also sets retail_price_paise.
-- -------------------------------------------------------

DROP FUNCTION IF EXISTS public.finalize_wholesale_gateway_purchase(UUID, BIGINT);
CREATE OR REPLACE FUNCTION public.finalize_wholesale_gateway_purchase(
    p_draft_id UUID,
    p_amount_paise BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_draft RECORD;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INT;
    v_unit_price BIGINT;
    v_merchant_user_id UUID;
BEGIN
    -- 1. Fetch and Validate Draft
    SELECT * INTO v_draft FROM public.wholesale_order_drafts 
    WHERE id = p_draft_id AND status = 'pending'
    FOR UPDATE; -- Lock the row

    IF v_draft.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Draft not found or already processed');
    END IF;

    -- 2. Validate Amount
    -- Fix: Use total_amount_paise (which is set by the draft route) instead of expected_amount_paise
    IF v_draft.total_amount_paise != p_amount_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch during fulfillment');
    END IF;

    -- 3. Get Merchant User ID for Transactions
    SELECT user_id INTO v_merchant_user_id FROM public.merchants WHERE id = v_draft.merchant_id;

    -- 4. Process Each Item
    FOR v_item IN SELECT unnest(v_draft.items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INT;
        v_unit_price := (v_item->>'unit_price_paise')::BIGINT;

        -- Check Stock
        IF NOT EXISTS (
            SELECT 1 FROM public.shopping_products 
            WHERE id = v_product_id AND admin_stock >= v_quantity
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Stock ran out for one or more items since draft creation');
        END IF;

        -- Deduct from Platform Stock
        UPDATE public.shopping_products 
        SET admin_stock = admin_stock - v_quantity,
            updated_at = now()
        WHERE id = v_product_id;

        -- Upsert into Merchant Inventory
        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise, updated_at, is_platform_product
        ) VALUES (
            v_draft.merchant_id, v_product_id, v_quantity, 
            (SELECT suggested_retail_price_paise FROM public.shopping_products WHERE id = v_product_id),
            now(),
            true
        )
        ON CONFLICT (merchant_id, product_id)
        DO UPDATE SET
            stock_quantity      = public.merchant_inventory.stock_quantity + v_quantity,
            retail_price_paise  = EXCLUDED.retail_price_paise,
            is_platform_product = true,
            updated_at          = now();

        -- Log to shopping orders (for history)
        INSERT INTO public.shopping_orders (
            buyer_id,
            buyer_type,
            seller_id,
            seller_type,
            product_id,
            quantity,
            unit_price_paise,
            total_price_paise,
            order_type,
            status
        ) VALUES (
            v_draft.merchant_id,
            'merchant',
            NULL, -- From admin
            'admin',
            v_product_id,
            v_quantity,
            v_unit_price,
            v_quantity * v_unit_price,
            'wholesale',
            'completed'
        );
    END LOOP;

    -- 5. Record Transaction
    INSERT INTO public.merchant_transactions (
        merchant_id, transaction_type, amount_paise, balance_after_paise, description
    ) VALUES (
        v_draft.merchant_id,
        'purchase',
        p_amount_paise,
        (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_draft.merchant_id), -- Wallet doesn't change
        'Wholesale Inventory Purchase via Gateway (Admin Stock)'
    );

    -- 6. Mark Draft as Completed
    UPDATE public.wholesale_order_drafts SET status = 'completed', updated_at = now() WHERE id = p_draft_id;

    RETURN jsonb_build_object('success', true);
END;
$$;


-- -------------------------------------------------------
-- 1b. purchase_platform_products(UUID, INTEGER, UUID)
-- -------------------------------------------------------
-- Source: 20260424_fix_purchase_security_bypass.sql (lines 5–81)
--         Has set_config bypass and SET search_path = public.
-- Change: ON CONFLICT block now refreshes retail_price_paise and
--         other metadata columns in addition to stock_quantity.
-- -------------------------------------------------------

DROP FUNCTION IF EXISTS public.purchase_platform_products(UUID, INTEGER, UUID);
CREATE OR REPLACE FUNCTION public.purchase_platform_products(
    p_product_id UUID,
    p_quantity INTEGER,
    p_merchant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wholesale_price BIGINT;
    v_total_cost BIGINT;
    v_merchant_balance BIGINT;
    v_admin_stock INTEGER;
    v_new_balance BIGINT;
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);

    IF NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    SELECT wholesale_price_paise, admin_stock INTO v_wholesale_price, v_admin_stock
    FROM public.shopping_products WHERE id = p_product_id FOR UPDATE;

    IF v_admin_stock < p_quantity THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient admin stock');
    END IF;

    v_total_cost := v_wholesale_price * p_quantity;

    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    UPDATE public.merchants SET wallet_balance_paise = wallet_balance_paise - v_total_cost 
    WHERE id = p_merchant_id 
    RETURNING wallet_balance_paise INTO v_new_balance;
    
    UPDATE public.shopping_products SET admin_stock = admin_stock - p_quantity WHERE id = p_product_id;

    INSERT INTO public.merchant_inventory (
        merchant_id, product_id, stock_quantity, retail_price_paise, 
        is_platform_product, is_active, custom_title, custom_description
    )
    SELECT 
        p_merchant_id, p_product_id, p_quantity, suggested_retail_price_paise, 
        true, false, title, description
    FROM public.shopping_products WHERE id = p_product_id
    ON CONFLICT (merchant_id, product_id) DO UPDATE
    SET stock_quantity      = public.merchant_inventory.stock_quantity + p_quantity,
        retail_price_paise  = EXCLUDED.retail_price_paise,
        is_platform_product = true,
        is_active           = EXCLUDED.is_active,
        custom_title        = EXCLUDED.custom_title,
        custom_description  = EXCLUDED.custom_description,
        updated_at          = now();

    INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
    VALUES (p_merchant_id, 'merchant', NULL, 'admin', p_product_id, p_quantity, v_wholesale_price, v_total_cost, 'wholesale');

    INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
    VALUES (p_merchant_id, 'purchase', -v_total_cost, v_new_balance, 'Wholesale purchase of products', jsonb_build_object('product_id', p_product_id, 'quantity', p_quantity));

    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN jsonb_build_object('success', true, 'message', 'Purchase successful');

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;


-- -------------------------------------------------------
-- 1c. purchase_platform_products_bulk(JSONB[], UUID)
-- -------------------------------------------------------
-- Source: fix_wholesale_gst.sql (lines 10–124) — GST-inclusive version.
--         This is the latest authoritative version. It does NOT have
--         SET search_path = public or set_config — preserve that exactly.
-- Change: ON CONFLICT block now refreshes retail_price_paise and
--         other metadata columns in addition to stock_quantity.
-- -------------------------------------------------------

DROP FUNCTION IF EXISTS public.purchase_platform_products_bulk(JSONB[], UUID);
CREATE OR REPLACE FUNCTION public.purchase_platform_products_bulk(
    p_items JSONB[], -- Array of {product_id: UUID, quantity: INT}
    p_merchant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item JSONB;
    v_product_id UUID;
    v_qty INTEGER;
    v_item_cost_paise BIGINT;
    v_total_cost BIGINT := 0;
    v_merchant_balance BIGINT;
    v_new_balance BIGINT;
    v_product RECORD;
    v_gst_amount_paise BIGINT;
BEGIN
    -- 0. Identity Validation
    IF NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    -- 1. Pre-validation loop: Check all stocks and calculate GST-inclusive total cost
    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
        END IF;

        SELECT wholesale_price_paise, admin_stock, title, gst_percentage INTO v_product
        FROM public.shopping_products WHERE id = v_product_id;

        IF v_product.admin_stock < v_qty THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock for ' || v_product.title);
        END IF;

        -- GST-inclusive item cost
        v_item_cost_paise := v_product.wholesale_price_paise * v_qty
                           + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_total_cost := v_total_cost + v_item_cost_paise;
    END LOOP;

    -- 2. Check and lock merchant balance
    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    -- 3. Execute updates in a single loop
    v_new_balance := v_merchant_balance;

    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;

        SELECT wholesale_price_paise, gst_percentage INTO v_product
        FROM public.shopping_products WHERE id = v_product_id FOR UPDATE;

        -- GST-inclusive item cost for deduction
        v_item_cost_paise := v_product.wholesale_price_paise * v_qty
                           + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_gst_amount_paise := ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);

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
        SET stock_quantity      = public.merchant_inventory.stock_quantity + v_qty,
            retail_price_paise  = EXCLUDED.retail_price_paise,
            is_platform_product = true,
            is_active           = EXCLUDED.is_active,
            custom_title        = EXCLUDED.custom_title,
            custom_description  = EXCLUDED.custom_description,
            updated_at          = now();

        -- Log Order (record base wholesale price for the unit price)
        INSERT INTO public.shopping_orders (buyer_id, buyer_type, seller_id, seller_type, product_id, quantity, unit_price_paise, total_price_paise, order_type)
        VALUES (p_merchant_id, 'merchant', NULL, 'admin', v_product_id, v_qty, v_product.wholesale_price_paise, v_item_cost_paise, 'wholesale');

        -- Update local tracking for ledger
        v_new_balance := v_new_balance - v_item_cost_paise;

        -- Log Transaction (One per item for detailed history, with GST in metadata)
        INSERT INTO public.merchant_transactions (merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata)
        VALUES (
            p_merchant_id, 'purchase', -v_item_cost_paise, v_new_balance,
            'Wholesale bulk purchase (GST-inclusive)',
            jsonb_build_object(
                'product_id', v_product_id,
                'quantity', v_qty,
                'wholesale_amount_paise', v_product.wholesale_price_paise * v_qty,
                'gst_amount_paise', v_gst_amount_paise,
                'gst_percentage', COALESCE(v_product.gst_percentage, 0)
            )
        );
    END LOOP;

    -- Final Balance Sync
    UPDATE public.merchants SET wallet_balance_paise = v_new_balance WHERE id = p_merchant_id;

    RETURN jsonb_build_object('success', true, 'message', 'Bulk purchase successful');
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_platform_products_bulk(JSONB[], UUID) TO authenticated, service_role;


-- ============================================================
-- SECTION 2 — Propagation trigger on shopping_products
-- ============================================================
-- When an admin edits suggested_retail_price_paise on a platform
-- product, this trigger automatically propagates the new price to
-- every merchant_inventory row that is a platform product.
--
-- Security note: trg_protect_inventory_stock (defined in
-- update_merchant_shopping_rpcs_v3.sql) blocks UPDATE only when
-- current_user IN ('authenticated', 'anon', 'anon_key').
-- SECURITY DEFINER functions run as the function owner
-- (postgres / service_role), which is NOT in that list, so no
-- set_config call is required here.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_platform_retail_price()
RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NEW.suggested_retail_price_paise IS DISTINCT FROM OLD.suggested_retail_price_paise THEN
    UPDATE public.merchant_inventory
       SET retail_price_paise = NEW.suggested_retail_price_paise,
           updated_at         = now()
     WHERE product_id = NEW.id
       AND is_platform_product = true;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_sync_platform_retail_price ON public.shopping_products;
CREATE TRIGGER trg_sync_platform_retail_price
  AFTER UPDATE OF suggested_retail_price_paise ON public.shopping_products
  FOR EACH ROW EXECUTE FUNCTION public.sync_platform_retail_price();


-- ============================================================
-- SECTION 3 — One-time backfill
-- ============================================================
-- Heals all currently drifted merchant_inventory rows in one shot.
-- This immediately fixes any live rows (e.g. "Makhana 250g") where
-- retail_price_paise has drifted from suggested_retail_price_paise.
-- ============================================================

DO $backfill$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.merchant_inventory mi
       SET retail_price_paise = sp.suggested_retail_price_paise,
           updated_at         = now()
      FROM public.shopping_products sp
     WHERE mi.product_id          = sp.id
       AND mi.is_platform_product = true
       AND mi.retail_price_paise IS DISTINCT FROM sp.suggested_retail_price_paise;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RAISE NOTICE 'Backfill complete: % merchant_inventory rows re-synced to platform retail price.', v_count;
END;
$backfill$;


COMMIT;


-- ============================================================
-- SECTION 4 — Verification query (commented out)
-- ============================================================
-- After deploying, uncomment and run the query below to confirm
-- that zero drifted rows remain. Expected result: 0 rows returned.
-- ============================================================

-- SELECT
--     mi.id            AS inventory_id,
--     mi.merchant_id,
--     mi.product_id,
--     sp.title         AS product_title,
--     sp.suggested_retail_price_paise,
--     mi.retail_price_paise AS inventory_retail_price_paise,
--     (sp.suggested_retail_price_paise - mi.retail_price_paise) AS drift_paise
-- FROM public.merchant_inventory mi
-- JOIN public.shopping_products  sp ON mi.product_id = sp.id
-- WHERE mi.is_platform_product = true
--   AND mi.retail_price_paise IS DISTINCT FROM sp.suggested_retail_price_paise
-- ORDER BY ABS(sp.suggested_retail_price_paise - mi.retail_price_paise) DESC;
