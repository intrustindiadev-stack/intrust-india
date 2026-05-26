-- ============================================================
-- Migration: 20260526_wholesale_purchase_batch_id
-- Purpose:   Add purchase_batch_id to wholesale orders/transactions
--            so that a single checkout session can be identified
--            across multiple rows; wire batch_id into both the
--            wallet RPC and the gateway fulfillment RPC; add a
--            helper RPC for the history page; insert in-app
--            notification after wallet purchase.
-- ============================================================

-- ─── 1. Schema additions ──────────────────────────────────────────
ALTER TABLE public.shopping_orders
    ADD COLUMN IF NOT EXISTS purchase_batch_id UUID NULL;

ALTER TABLE public.merchant_transactions
    ADD COLUMN IF NOT EXISTS purchase_batch_id UUID NULL;

ALTER TABLE public.wholesale_order_drafts
    ADD COLUMN IF NOT EXISTS purchase_batch_id UUID NULL;

-- ─── 2. Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shopping_orders_batch
    ON public.shopping_orders (buyer_id, buyer_type, purchase_batch_id)
    WHERE purchase_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_merchant_transactions_batch
    ON public.merchant_transactions (merchant_id, purchase_batch_id)
    WHERE purchase_batch_id IS NOT NULL;

-- ─── 3. Wallet RPC: purchase_platform_products_bulk ──────────────
-- Drop then recreate to add batch_id + notification insert.
DROP FUNCTION IF EXISTS public.purchase_platform_products_bulk(JSONB[], UUID);

CREATE OR REPLACE FUNCTION public.purchase_platform_products_bulk(
    p_items      JSONB[],
    p_merchant_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item              JSONB;
    v_product_id        UUID;
    v_qty               INTEGER;
    v_item_cost_paise   BIGINT;
    v_total_cost        BIGINT := 0;
    v_merchant_balance  BIGINT;
    v_new_balance       BIGINT;
    v_product           RECORD;
    v_gst_amount_paise  BIGINT;
    v_batch_id          UUID := gen_random_uuid();
    v_merchant_user_id  UUID;
    v_item_count        INTEGER := 0;
BEGIN
    -- ── Auth guard ──────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM public.merchants
        WHERE id = p_merchant_id AND user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
    END IF;

    -- ── Pre-flight: validate qty and accumulate total cost ──────
    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty        := (v_item->>'quantity')::INTEGER;

        IF v_qty <= 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
        END IF;

        SELECT wholesale_price_paise, admin_stock, title, gst_percentage
        INTO v_product
        FROM public.shopping_products WHERE id = v_product_id;

        IF v_product.admin_stock < v_qty THEN
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock for ' || v_product.title);
        END IF;

        v_item_cost_paise := v_product.wholesale_price_paise * v_qty
                           + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_total_cost := v_total_cost + v_item_cost_paise;
        v_item_count := v_item_count + v_qty;
    END LOOP;

    -- ── Balance check (row lock) ────────────────────────────────
    SELECT wallet_balance_paise INTO v_merchant_balance
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance < v_total_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    v_new_balance := v_merchant_balance;

    -- ── Main loop: deduct stock, upsert inventory, record orders + txns ──
    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty        := (v_item->>'quantity')::INTEGER;

        SELECT wholesale_price_paise, gst_percentage
        INTO v_product
        FROM public.shopping_products WHERE id = v_product_id FOR UPDATE;

        v_item_cost_paise  := v_product.wholesale_price_paise * v_qty
                            + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_gst_amount_paise := ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);

        UPDATE public.shopping_products
        SET admin_stock = admin_stock - v_qty
        WHERE id = v_product_id;

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

        INSERT INTO public.shopping_orders (
            buyer_id, buyer_type, seller_id, seller_type,
            product_id, quantity, unit_price_paise, total_price_paise,
            order_type, purchase_batch_id
        )
        VALUES (
            p_merchant_id, 'merchant', NULL, 'admin',
            v_product_id, v_qty, v_product.wholesale_price_paise, v_item_cost_paise,
            'wholesale', v_batch_id
        );

        v_new_balance := v_new_balance - v_item_cost_paise;

        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise,
            description, metadata, purchase_batch_id
        )
        VALUES (
            p_merchant_id, 'purchase', -v_item_cost_paise, v_new_balance,
            'Wholesale bulk purchase (GST-inclusive)',
            jsonb_build_object(
                'product_id',             v_product_id,
                'quantity',               v_qty,
                'wholesale_amount_paise', v_product.wholesale_price_paise * v_qty,
                'gst_amount_paise',       v_gst_amount_paise,
                'gst_percentage',         COALESCE(v_product.gst_percentage, 0),
                'batch_id',               v_batch_id
            ),
            v_batch_id
        );
    END LOOP;

    -- ── Update wallet balance ────────────────────────────────────
    UPDATE public.merchants SET wallet_balance_paise = v_new_balance WHERE id = p_merchant_id;

    -- ── Resolve merchant user_id for notification ────────────────
    SELECT user_id INTO v_merchant_user_id FROM public.merchants WHERE id = p_merchant_id;

    -- ── Insert in-app notification ───────────────────────────────
    INSERT INTO public.notifications (
        user_id, title, body, reference_id, reference_type
    )
    VALUES (
        v_merchant_user_id,
        'Wholesale stock purchased 📦',
        '₹' || (v_total_cost / 100)::TEXT || ' across ' || v_item_count::TEXT || ' items — tap to download invoice',
        v_batch_id,
        'wholesale_purchase'
    );

    RETURN jsonb_build_object(
        'success',      true,
        'batch_id',     v_batch_id,
        'total_paise',  v_total_cost,
        'message',      'Bulk purchase successful'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_platform_products_bulk(JSONB[], UUID) TO authenticated, service_role;

-- ─── 4. Gateway RPC: finalize_wholesale_gateway_purchase ─────────
-- Drop & recreate to stamp batch_id on orders + transactions + draft.
DROP FUNCTION IF EXISTS public.finalize_wholesale_gateway_purchase(UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.finalize_wholesale_gateway_purchase(
    p_draft_id     UUID,
    p_amount_paise BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_draft            RECORD;
    v_item             JSONB;
    v_product_id       UUID;
    v_quantity         INT;
    v_unit_price       BIGINT;
    v_merchant_user_id UUID;
    v_batch_id         UUID := gen_random_uuid();
BEGIN
    SELECT * INTO v_draft FROM public.wholesale_order_drafts
    WHERE id = p_draft_id AND status = 'pending'
    FOR UPDATE;

    IF v_draft.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Draft not found or already processed');
    END IF;

    IF v_draft.total_amount_paise != p_amount_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch during fulfillment');
    END IF;

    SELECT user_id INTO v_merchant_user_id FROM public.merchants WHERE id = v_draft.merchant_id;

    FOR v_item IN SELECT unnest(v_draft.items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity   := (v_item->>'quantity')::INT;
        v_unit_price := (v_item->>'unit_price_paise')::BIGINT;

        IF NOT EXISTS (
            SELECT 1 FROM public.shopping_products
            WHERE id = v_product_id AND admin_stock >= v_quantity
        ) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Stock ran out for one or more items since draft creation');
        END IF;

        UPDATE public.shopping_products
        SET admin_stock = admin_stock - v_quantity,
            updated_at  = now()
        WHERE id = v_product_id;

        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise, updated_at, is_platform_product
        ) VALUES (
            v_draft.merchant_id, v_product_id, v_quantity,
            (SELECT suggested_retail_price_paise FROM public.shopping_products WHERE id = v_product_id),
            now(), true
        )
        ON CONFLICT (merchant_id, product_id) DO UPDATE SET
            stock_quantity      = public.merchant_inventory.stock_quantity + v_quantity,
            retail_price_paise  = EXCLUDED.retail_price_paise,
            is_platform_product = true,
            updated_at          = now();

        INSERT INTO public.shopping_orders (
            buyer_id, buyer_type, seller_id, seller_type,
            product_id, quantity, unit_price_paise, total_price_paise,
            order_type, status, purchase_batch_id
        ) VALUES (
            v_draft.merchant_id, 'merchant', NULL, 'admin',
            v_product_id, v_quantity, v_unit_price, v_quantity * v_unit_price,
            'wholesale', 'completed', v_batch_id
        );
    END LOOP;

    INSERT INTO public.merchant_transactions (
        merchant_id, transaction_type, amount_paise, balance_after_paise,
        description, purchase_batch_id
    ) VALUES (
        v_draft.merchant_id, 'purchase', p_amount_paise,
        (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_draft.merchant_id),
        'Wholesale Inventory Purchase via Gateway (Admin Stock)',
        v_batch_id
    );

    UPDATE public.wholesale_order_drafts
    SET status = 'completed', purchase_batch_id = v_batch_id, updated_at = now()
    WHERE id = p_draft_id;

    RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_wholesale_gateway_purchase(UUID, BIGINT) TO authenticated, service_role;

-- ─── 5. New helper RPC: get_wholesale_purchase_batch ─────────────
CREATE OR REPLACE FUNCTION public.get_wholesale_purchase_batch(p_batch_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_merchant_id UUID;
    v_result      JSONB;
BEGIN
    -- Verify caller owns this batch via merchant.user_id
    SELECT o.buyer_id INTO v_merchant_id
    FROM public.shopping_orders o
    JOIN public.merchants m ON m.id = o.buyer_id
    WHERE o.purchase_batch_id = p_batch_id
      AND o.buyer_type = 'merchant'
      AND m.user_id = auth.uid()
    LIMIT 1;

    IF v_merchant_id IS NULL THEN
        RAISE EXCEPTION 'insufficient_privilege';
    END IF;

    SELECT jsonb_build_object(
        'batch_id',    p_batch_id,
        'created_at',  MIN(o.created_at),
        'total_paise', SUM(o.total_price_paise),
        'items', jsonb_agg(
            jsonb_build_object(
                'product_id',        o.product_id,
                'title',             sp.title,
                'hsn_code',          sp.hsn_code,
                'gst_percentage',    sp.gst_percentage,
                'quantity',          o.quantity,
                'unit_price_paise',  o.unit_price_paise,
                'total_price_paise', o.total_price_paise,
                'product_images',    sp.product_images
            )
        ),
        'merchant', jsonb_build_object(
            'id',               m.id,
            'business_name',    m.business_name,
            'business_address', m.business_address,
            'gst_number',       m.gst_number,
            'business_phone',   m.business_phone,
            'business_email',   m.business_email,
            'owner_name',       m.owner_name
        )
    )
    INTO v_result
    FROM public.shopping_orders o
    JOIN public.shopping_products sp ON sp.id = o.product_id
    JOIN public.merchants m ON m.id = o.buyer_id
    WHERE o.purchase_batch_id = p_batch_id
      AND o.buyer_type = 'merchant';

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wholesale_purchase_batch(UUID) TO authenticated;

-- ─── 6. RLS policy guard for merchant shopping_orders read ────────
-- Ensure merchants can SELECT their own wholesale shopping_orders rows.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'shopping_orders'
          AND policyname = 'merchant_own_wholesale_orders_select'
    ) THEN
        CREATE POLICY merchant_own_wholesale_orders_select
        ON public.shopping_orders FOR SELECT
        USING (
            buyer_type = 'merchant'
            AND buyer_id IN (
                SELECT id FROM public.merchants WHERE user_id = auth.uid()
            )
        );
    END IF;
END;
$$;
