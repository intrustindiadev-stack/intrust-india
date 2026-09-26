-- =============================================================================
-- MIGRATION: 20260926010000_fix_wallet_checkout_and_wholesale_rpcs.sql
-- Description:
--   1. Harden purchase_platform_products_bulk:
--      - SECURITY DEFINER, search_path = public.
--      - Explicitly set app.internal_bypass = 'true' locally within transaction.
--      - Server-side price calculation with GST-inclusive cost matching business logic.
--      - Lock merchant wallet row with FOR UPDATE before checking balance.
--      - Atomic stock deduction, merchant inventory upsert, order & transaction logging.
--      - Generates/preserves purchase_batch_id and returns total_paise and batch_id.
--      - Idempotency support via p_idempotency_key.
--      - Sends in-app notification.
--      - Overloaded 2-arg and 3-arg versions for full backward compatibility.
--   2. Harden purchase_platform_products (single-item wholesale):
--      - SECURITY DEFINER, search_path = public.
--      - Sets app.internal_bypass = 'true' locally.
--      - FOR UPDATE row locks, GST-inclusive pricing, ledger logging.
--   3. Harden customer_checkout_v4 (Customer Cart Wallet Checkout):
--      - SECURITY DEFINER, search_path = public.
--      - Sets app.internal_bypass = 'true' locally.
--      - Locks customer_wallets row with FOR UPDATE before checking balance.
--      - Preserves fashion variants pricing and inventory decrements.
--      - Server-authoritative payable calculation (effective price + GST + delivery fee).
--      - Cancels prior abandoned gateway drafts.
--      - Atomic wallet debit, customer_wallet_transactions ledger row, cart deletion.
--      - Defers merchant payout settlement to order fulfillment.
--   4. Harden update_order_delivery_v3:
--      - Sets app.internal_bypass = 'true' locally so when merchant marks orders delivered,
--        profit settlement update to merchants.wallet_balance_paise succeeds without trigger guard violation.
-- =============================================================================

BEGIN;

-- ── 1. purchase_platform_products_bulk (Wholesale Cart Wallet Checkout) ───────
DROP FUNCTION IF EXISTS public.purchase_platform_products_bulk(JSONB[], UUID);
DROP FUNCTION IF EXISTS public.purchase_platform_products_bulk(JSONB[], UUID, UUID);

CREATE OR REPLACE FUNCTION public.purchase_platform_products_bulk(
    p_items           JSONB[],
    p_merchant_id     UUID,
    p_idempotency_key UUID DEFAULT NULL
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
    v_batch_id          UUID;
    v_merchant_user_id  UUID;
    v_item_count        INTEGER := 0;
    v_caller_uid        UUID;
    v_existing_batch    RECORD;
BEGIN
    -- 1. Internal bypass flag: scoped locally to this transaction
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- 2. Caller Authentication / Authorization
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.merchants
            WHERE id = p_merchant_id AND user_id = v_caller_uid
        ) THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
        END IF;
    END IF;

    -- 3. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT purchase_batch_id, amount_paise INTO v_existing_batch
        FROM public.merchant_transactions
        WHERE merchant_id = p_merchant_id
          AND (purchase_batch_id = p_idempotency_key OR metadata->>'idempotency_key' = p_idempotency_key::text)
        LIMIT 1;

        IF FOUND THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object(
                'success', true,
                'idempotent', true,
                'batch_id', v_existing_batch.purchase_batch_id,
                'total_paise', ABS(v_existing_batch.amount_paise),
                'message', 'Bulk purchase already processed'
            );
        END IF;
        v_batch_id := p_idempotency_key;
    ELSE
        v_batch_id := gen_random_uuid();
    END IF;

    -- 4. Pre-flight: validate qty, stock, and calculate total cost server-side
    IF p_items IS NULL OR array_length(p_items, 1) IS NULL OR array_length(p_items, 1) = 0 THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Cart is empty');
    END IF;

    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty        := (v_item->>'quantity')::INTEGER;

        IF v_qty IS NULL OR v_qty <= 0 THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
        END IF;

        SELECT wholesale_price_paise, admin_stock, title, gst_percentage
        INTO v_product
        FROM public.shopping_products WHERE id = v_product_id;

        IF NOT FOUND THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Product not found: ' || v_product_id);
        END IF;

        IF v_product.admin_stock < v_qty THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock for ' || v_product.title);
        END IF;

        v_item_cost_paise := (v_product.wholesale_price_paise * v_qty)
                           + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_total_cost := v_total_cost + v_item_cost_paise;
        v_item_count := v_item_count + v_qty;
    END LOOP;

    -- 5. Lock and validate merchant wallet balance with FOR UPDATE
    SELECT wallet_balance_paise, user_id INTO v_merchant_balance, v_merchant_user_id
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance IS NULL THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Merchant not found');
    END IF;

    IF v_merchant_balance < v_total_cost THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    v_new_balance := v_merchant_balance;

    -- 6. Main execution: deduct stock, upsert inventory, record orders + ledger
    FOREACH v_item IN ARRAY p_items LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty        := (v_item->>'quantity')::INTEGER;

        SELECT wholesale_price_paise, gst_percentage, title, description, suggested_retail_price_paise
        INTO v_product
        FROM public.shopping_products WHERE id = v_product_id FOR UPDATE;

        v_item_cost_paise  := (v_product.wholesale_price_paise * v_qty)
                            + ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);
        v_gst_amount_paise := ROUND(v_product.wholesale_price_paise * v_qty * COALESCE(v_product.gst_percentage, 0) / 100.0);

        -- Decrement platform stock
        UPDATE public.shopping_products
        SET admin_stock = admin_stock - v_qty, updated_at = now()
        WHERE id = v_product_id;

        -- Upsert into merchant inventory
        INSERT INTO public.merchant_inventory (
            merchant_id, product_id, stock_quantity, retail_price_paise,
            is_platform_product, is_active, custom_title, custom_description, updated_at
        )
        VALUES (
            p_merchant_id, v_product_id, v_qty, v_product.suggested_retail_price_paise,
            true, false, v_product.title, v_product.description, now()
        )
        ON CONFLICT (merchant_id, product_id) DO UPDATE
        SET stock_quantity      = public.merchant_inventory.stock_quantity + v_qty,
            retail_price_paise  = EXCLUDED.retail_price_paise,
            is_platform_product = true,
            updated_at          = now();

        -- Record wholesale shopping order
        INSERT INTO public.shopping_orders (
            buyer_id, buyer_type, seller_id, seller_type,
            product_id, quantity, unit_price_paise, total_price_paise,
            order_type, purchase_batch_id, status
        )
        VALUES (
            p_merchant_id, 'merchant', NULL, 'admin',
            v_product_id, v_qty, v_product.wholesale_price_paise, v_item_cost_paise,
            'wholesale', v_batch_id, 'completed'
        );

        v_new_balance := v_new_balance - v_item_cost_paise;

        -- Write merchant ledger entry
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
                'batch_id',               v_batch_id,
                'idempotency_key',        v_batch_id
            ),
            v_batch_id
        );
    END LOOP;

    -- 7. Update authoritative merchant wallet balance
    UPDATE public.merchants
    SET wallet_balance_paise = v_new_balance, updated_at = now()
    WHERE id = p_merchant_id;

    -- 8. In-app notification
    IF v_merchant_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id, title, body, reference_id, reference_type
        )
        VALUES (
            v_merchant_user_id,
            'Wholesale stock purchased 📦',
            '₹' || (v_total_cost / 100)::TEXT || ' across ' || v_item_count::TEXT || ' items — tap to view inventory',
            v_batch_id,
            'wholesale_purchase'
        );
    END IF;

    -- 9. Reset bypass flag and return
    PERFORM set_config('app.internal_bypass', 'false', true);

    RETURN jsonb_build_object(
        'success',      true,
        'batch_id',     v_batch_id,
        'total_paise',  v_total_cost,
        'message',      'Bulk purchase successful'
    );

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;

-- Ensure no conflicting 2-argument overload exists (the 3-argument function with DEFAULT NULL already handles 2-argument calls without ambiguity)
DROP FUNCTION IF EXISTS public.purchase_platform_products_bulk(JSONB[], UUID);

REVOKE ALL ON FUNCTION public.purchase_platform_products_bulk(JSONB[], UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_platform_products_bulk(JSONB[], UUID, UUID) TO authenticated, service_role;



-- ── 2. purchase_platform_products (Single-item Wholesale) ─────────────────────
CREATE OR REPLACE FUNCTION public.purchase_platform_products(
    p_product_id  UUID,
    p_quantity    INTEGER,
    p_merchant_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wholesale_price   BIGINT;
    v_admin_stock       INTEGER;
    v_gst_percentage    NUMERIC;
    v_item_cost_paise   BIGINT;
    v_gst_amount_paise  BIGINT;
    v_merchant_balance  BIGINT;
    v_new_balance       BIGINT;
    v_product           RECORD;
    v_batch_id          UUID := gen_random_uuid();
    v_merchant_user_id  UUID;
    v_caller_uid        UUID;
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);

    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.merchants
            WHERE id = p_merchant_id AND user_id = v_caller_uid
        ) THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Merchant identity mismatch');
        END IF;
    END IF;

    IF p_quantity <= 0 THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Quantity must be greater than zero');
    END IF;

    SELECT wholesale_price_paise, admin_stock, gst_percentage, title, description, suggested_retail_price_paise
    INTO v_product
    FROM public.shopping_products WHERE id = p_product_id FOR UPDATE;

    IF NOT FOUND THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Product not found');
    END IF;

    IF v_product.admin_stock < p_quantity THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient admin stock');
    END IF;

    v_item_cost_paise  := (v_product.wholesale_price_paise * p_quantity)
                        + ROUND(v_product.wholesale_price_paise * p_quantity * COALESCE(v_product.gst_percentage, 0) / 100.0);
    v_gst_amount_paise := ROUND(v_product.wholesale_price_paise * p_quantity * COALESCE(v_product.gst_percentage, 0) / 100.0);

    SELECT wallet_balance_paise, user_id INTO v_merchant_balance, v_merchant_user_id
    FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;

    IF v_merchant_balance IS NULL THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Merchant not found');
    END IF;

    IF v_merchant_balance < v_item_cost_paise THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient merchant balance');
    END IF;

    v_new_balance := v_merchant_balance - v_item_cost_paise;

    -- Update Stock
    UPDATE public.shopping_products
    SET admin_stock = admin_stock - p_quantity, updated_at = now()
    WHERE id = p_product_id;

    -- Add to Inventory
    INSERT INTO public.merchant_inventory (
        merchant_id, product_id, stock_quantity, retail_price_paise,
        is_platform_product, is_active, custom_title, custom_description, updated_at
    )
    VALUES (
        p_merchant_id, p_product_id, p_quantity, v_product.suggested_retail_price_paise,
        true, false, v_product.title, v_product.description, now()
    )
    ON CONFLICT (merchant_id, product_id) DO UPDATE
    SET stock_quantity      = public.merchant_inventory.stock_quantity + p_quantity,
        retail_price_paise  = EXCLUDED.retail_price_paise,
        is_platform_product = true,
        updated_at          = now();

    -- Log Order
    INSERT INTO public.shopping_orders (
        buyer_id, buyer_type, seller_id, seller_type,
        product_id, quantity, unit_price_paise, total_price_paise,
        order_type, purchase_batch_id, status
    )
    VALUES (
        p_merchant_id, 'merchant', NULL, 'admin',
        p_product_id, p_quantity, v_product.wholesale_price_paise, v_item_cost_paise,
        'wholesale', v_batch_id, 'completed'
    );

    -- Log Transaction
    INSERT INTO public.merchant_transactions (
        merchant_id, transaction_type, amount_paise, balance_after_paise,
        description, metadata, purchase_batch_id
    )
    VALUES (
        p_merchant_id, 'purchase', -v_item_cost_paise, v_new_balance,
        'Wholesale purchase of products (GST-inclusive)',
        jsonb_build_object(
            'product_id',             p_product_id,
            'quantity',               p_quantity,
            'wholesale_amount_paise', v_product.wholesale_price_paise * p_quantity,
            'gst_amount_paise',       v_gst_amount_paise,
            'gst_percentage',         COALESCE(v_product.gst_percentage, 0),
            'batch_id',               v_batch_id
        ),
        v_batch_id
    );

    -- Deduct balance
    UPDATE public.merchants
    SET wallet_balance_paise = v_new_balance, updated_at = now()
    WHERE id = p_merchant_id;

    IF v_merchant_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
            user_id, title, body, reference_id, reference_type
        )
        VALUES (
            v_merchant_user_id,
            'Wholesale stock purchased 📦',
            '₹' || (v_item_cost_paise / 100)::TEXT || ' for ' || v_product.title,
            v_batch_id,
            'wholesale_purchase'
        );
    END IF;

    PERFORM set_config('app.internal_bypass', 'false', true);

    RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id, 'total_paise', v_item_cost_paise, 'message', 'Purchase successful');

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_platform_products(UUID, INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_platform_products(UUID, INTEGER, UUID) TO authenticated, service_role;


-- ── 3. customer_checkout_v4 (Customer Cart Wallet Checkout) ───────────────────
CREATE OR REPLACE FUNCTION public.customer_checkout_v4(p_customer_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_uid          UUID;
    v_customer_id         UUID;
    v_wallet_id           UUID;
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
    -- 1. Enable internal bypass for system checkout mutations
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- 2. Authorization
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NULL THEN
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Caller identity could not be determined.';
        END IF;
        v_customer_id := p_customer_id;
    ELSE
        -- Prevent IDOR: non-service callers can only check out their own cart
        IF p_customer_id IS NOT NULL AND p_customer_id <> v_caller_uid THEN
            RAISE EXCEPTION 'Unauthorized: Cannot checkout for another user';
        END IF;
        v_customer_id := v_caller_uid;
    END IF;

    -- 3. Lock Customer Wallet Row with FOR UPDATE
    SELECT id, balance_paise INTO v_wallet_id, v_wallet_balance
    FROM public.customer_wallets
    WHERE user_id = v_customer_id
    FOR UPDATE;

    IF v_wallet_balance IS NULL THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    -- 4. Customer Info
    SELECT full_name, phone, address
    INTO v_customer_name, v_customer_phone, v_delivery_address
    FROM public.user_profiles
    WHERE id = v_customer_id;

    IF v_delivery_address IS NULL OR v_delivery_address = '' THEN
        SELECT full_address INTO v_delivery_address
        FROM public.kyc_records
        WHERE user_id = v_customer_id;
    END IF;

    -- 5. Cart Inspection
    SELECT is_platform_item INTO v_is_platform
    FROM public.shopping_cart
    WHERE customer_id = v_customer_id
    LIMIT 1;

    IF v_is_platform IS NULL THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
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

    -- 6. Totalling Loop: Stock Validation & Payable Calculation
    FOR v_cart_items IN
        SELECT
            c.*,
            CASE 
                 WHEN c.variant_id IS NOT NULL THEN fv.price_paise
                 WHEN c.is_platform_item THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise)
            END                    AS effective_price,
            mi.stock_quantity      AS merchant_stock,
            p.admin_stock          AS platform_stock,
            fv.inventory_quantity  AS variant_stock,
            p.title                AS product_title,
            p.gst_percentage       AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products      p  ON c.product_id   = p.id
        LEFT JOIN public.fashion_variants   fv ON c.variant_id   = fv.id
        WHERE c.customer_id = v_customer_id
    LOOP
        v_total_paise := v_total_paise
            + (v_cart_items.effective_price * v_cart_items.quantity)
            + ROUND(v_cart_items.effective_price * v_cart_items.quantity
                    * COALESCE(v_cart_items.gst_pct, 0) / 100);

        IF v_cart_items.variant_id IS NOT NULL THEN
            IF v_cart_items.variant_stock < v_cart_items.quantity THEN
                PERFORM set_config('app.internal_bypass', 'false', true);
                RETURN jsonb_build_object('success', false, 'message',
                    'Insufficient variant stock for ' || v_cart_items.product_title);
            END IF;
        ELSIF v_cart_items.is_platform_item THEN
            IF v_cart_items.platform_stock < v_cart_items.quantity THEN
                PERFORM set_config('app.internal_bypass', 'false', true);
                RETURN jsonb_build_object('success', false, 'message',
                    'Insufficient platform stock for ' || v_cart_items.product_title);
            END IF;
        ELSE
            IF v_cart_items.merchant_stock < v_cart_items.quantity THEN
                PERFORM set_config('app.internal_bypass', 'false', true);
                RETURN jsonb_build_object('success', false, 'message',
                    'Insufficient merchant stock for ' || v_cart_items.product_title);
            END IF;
        END IF;
    END LOOP;

    v_total_paise := v_total_paise + v_delivery_fee_paise;

    IF v_wallet_balance < v_total_paise THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- Cancel prior pending gateway drafts to avoid orphaned orders
    UPDATE public.shopping_order_groups
    SET status = 'cancelled',
        delivery_status = 'cancelled',
        payment_status = 'failed'
    WHERE customer_id = v_customer_id
      AND status = 'pending'
      AND payment_method = 'gateway';

    -- 7. Insert Order Group
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

    -- 8. Item-Processing Loop
    FOR v_item IN
        SELECT
            c.*,
            CASE 
                 WHEN c.variant_id IS NOT NULL THEN fv.price_paise
                 WHEN c.is_platform_item THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise)
            END                    AS effective_price,
            mi.merchant_id,
            p.wholesale_price_paise AS platform_cost,
            p.gst_percentage        AS gst_pct,
            fv.size                 AS variant_size,
            fv.color                AS variant_color,
            fv.sku                  AS variant_sku
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products      p  ON c.product_id   = p.id
        LEFT JOIN public.fashion_variants   fv ON c.variant_id   = fv.id
        WHERE c.customer_id = v_customer_id
    LOOP
        v_item_total := v_item.effective_price * v_item.quantity;

        IF v_item.variant_id IS NOT NULL THEN
            UPDATE public.fashion_variants
            SET inventory_quantity = inventory_quantity - v_item.quantity, updated_at = now()
            WHERE id = v_item.variant_id;
        END IF;

        IF v_item.is_platform_item THEN
            UPDATE public.shopping_products
            SET admin_stock = admin_stock - v_item.quantity, updated_at = now()
            WHERE id = v_item.product_id;

            UPDATE public.shopping_products
            SET platform_listed = false
            WHERE id = v_item.product_id AND admin_stock = 0;

            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id,
                quantity, unit_price_paise, cost_price_paise, profit_paise, gst_amount_paise,
                variant_id, variant_snapshot
            ) VALUES (
                v_group_id, NULL, v_item.product_id, NULL,
                v_item.quantity, v_item.effective_price, v_item.platform_cost,
                (v_item.effective_price - COALESCE(v_item.platform_cost, 0)) * v_item.quantity,
                ROUND(v_item.effective_price * v_item.quantity * COALESCE(v_item.gst_pct, 0) / 100),
                v_item.variant_id,
                CASE WHEN v_item.variant_id IS NOT NULL THEN jsonb_build_object(
                    'size', v_item.variant_size,
                    'color', v_item.variant_color,
                    'sku', v_item.variant_sku
                ) ELSE NULL END
            );
        ELSE
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
                profit_paise, commission_amount_paise, gst_amount_paise,
                variant_id, variant_snapshot
            ) VALUES (
                v_group_id, v_item.merchant_id, v_item.product_id, v_item.inventory_id,
                v_item.quantity, v_item.effective_price, v_product_cost,
                (v_item_total - v_commission_paise) - (v_product_cost * v_item.quantity),
                v_commission_paise,
                ROUND(v_item.effective_price * v_item.quantity * COALESCE(v_item.gst_pct, 0) / 100),
                v_item.variant_id,
                CASE WHEN v_item.variant_id IS NOT NULL THEN jsonb_build_object(
                    'size', v_item.variant_size,
                    'color', v_item.variant_color,
                    'sku', v_item.variant_sku
                ) ELSE NULL END
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

    -- 9. Debit Customer Wallet & Log Ledger Entry
    UPDATE public.customer_wallets
    SET balance_paise = balance_paise - v_total_paise, updated_at = now()
    WHERE id = v_wallet_id;

    INSERT INTO public.customer_wallet_transactions (
        wallet_id, user_id, type, amount_paise,
        balance_before_paise, balance_after_paise, description, reference_id, reference_type
    ) VALUES (
        v_wallet_id,
        v_customer_id, 'DEBIT', v_total_paise,
        v_wallet_balance, v_wallet_balance - v_total_paise,
        'Shopping Purchase: Order Group ' || v_group_id,
        v_group_id::text, 'shopping_order'
    );

    -- 10. Clear Customer Cart
    DELETE FROM public.shopping_cart WHERE customer_id = v_customer_id;

    PERFORM set_config('app.internal_bypass', 'false', true);

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id);

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.customer_checkout_v4(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_checkout_v4(UUID) TO service_role, authenticated;


-- ── 4. update_order_delivery_v3 (Settlement on Delivery / Status Update) ──────
DROP FUNCTION IF EXISTS public.update_order_delivery_v3(uuid, text, text, timestamp with time zone, text, boolean, boolean, boolean);

CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(
    p_order_id         uuid,
    p_new_status       text,
    p_tracking_number  text,
    p_estimated_at     timestamp with time zone,
    p_status_notes     text,
    p_is_admin         boolean DEFAULT false,
    p_is_merchant      boolean DEFAULT false,
    p_is_customer      boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_order     RECORD;
    v_user_id   UUID;
BEGIN
    -- Enable internal bypass so merchant profit settlement update to merchants table is permitted
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- Get caller ID from auth
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Basic Authorization Checks
    IF p_is_admin THEN
        IF NOT public.is_admin() THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;
    ELSIF p_is_merchant THEN
        IF v_order.merchant_id IS NOT NULL 
           AND v_order.merchant_id != v_user_id 
           AND NOT EXISTS (SELECT 1 FROM public.merchants WHERE id = v_order.merchant_id AND user_id = v_user_id) THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;
    ELSIF p_is_customer THEN
        IF v_order.customer_id != v_user_id THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;
    ELSE
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: Missing role flag');
    END IF;

    -- Update Order Status
    UPDATE public.shopping_order_groups
    SET delivery_status = p_new_status,
        tracking_number = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes = p_status_notes,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- SETTLEMENT LOGIC (Settle on Merchant Approval)
    IF v_order.delivery_status = 'pending' AND p_new_status IN ('packed', 'shipped', 'delivered')
       AND v_order.settlement_status = 'pending'
       AND p_is_merchant = true THEN

        -- Credit the merchant wallet (70% share)
        UPDATE public.merchants
        SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + COALESCE(v_order.merchant_profit_paise, 0),
            total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + COALESCE(v_order.platform_cut_paise, 0)
        WHERE id = v_order.merchant_id;

        -- Record Merchant Transaction
        INSERT INTO public.merchant_transactions (
            merchant_id,
            transaction_type,
            amount_paise,
            balance_after_paise,
            description,
            created_at
        ) VALUES (
            v_order.merchant_id,
            'sale',
            COALESCE(v_order.merchant_profit_paise, 0),
            (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
            'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Fulfillment)',
            NOW()
        );

        -- Record Platform Ledger Entry
        INSERT INTO public.platform_ledger (
            transaction_id,
            entry_type,
            amount_paise,
            balance_after_paise,
            description,
            created_at
        ) VALUES (
            p_order_id,
            'shopping_commission',
            COALESCE(v_order.platform_cut_paise, 0),
            (SELECT COALESCE(SUM(amount_paise), 0)
             FROM public.platform_ledger
             WHERE entry_type = 'shopping_commission') + COALESCE(v_order.platform_cut_paise, 0),
            'Shopping commission: Order #' || substring(p_order_id::text from 1 for 8),
            NOW()
        );

        -- Update settlement_status to settled
        UPDATE public.shopping_order_groups
        SET settlement_status = 'settled'
        WHERE id = p_order_id;
    END IF;

    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN jsonb_build_object('success', true, 'message', 'Order delivery info updated successfully');

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;


-- ── 5. perform_wallet_adjustment (Admin adjustment safety) ───────────────────
CREATE OR REPLACE FUNCTION public.perform_wallet_adjustment(
    p_target_user_id   uuid,
    p_wallet_type      text,
    p_operation        text,
    p_amount_paise     bigint,
    p_admin_user_id    uuid,
    p_reason           text,
    p_idempotency_key  uuid,
    p_ip_address       text DEFAULT '0.0.0.0'::text,
    p_user_agent       text DEFAULT ''::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_existing_log        RECORD;
    v_target_merchant_id  UUID;
    v_target_wallet_id    UUID;
    v_balance_before      BIGINT;
    v_balance_after       BIGINT;
    v_audit_log_id        UUID;
    v_transaction_id      UUID;
BEGIN
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- 1. Idempotency Check
    SELECT id, balance_after_paise INTO v_existing_log
    FROM public.wallet_audit_logs
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN json_build_object(
            'success', true,
            'duplicate', true,
            'audit_log_id', v_existing_log.id,
            'balance_after_paise', v_existing_log.balance_after_paise
        );
    END IF;

    -- 2. Validate Inputs
    IF p_amount_paise <= 0 THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    IF p_operation NOT IN ('credit', 'debit') THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RAISE EXCEPTION 'Invalid operation: must be credit or debit';
    END IF;

    -- 3. Branch by Wallet Type
    IF p_wallet_type = 'merchant' THEN
        SELECT id, wallet_balance_paise INTO v_target_merchant_id, v_balance_before
        FROM public.merchants
        WHERE user_id = p_target_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RAISE EXCEPTION 'Merchant record not found for user';
        END IF;

        IF p_operation = 'credit' THEN
            v_balance_after := v_balance_before + p_amount_paise;
        ELSE
            IF v_balance_before < p_amount_paise THEN
                PERFORM set_config('app.internal_bypass', 'false', true);
                RAISE EXCEPTION 'Insufficient merchant wallet balance';
            END IF;
            v_balance_after := v_balance_before - p_amount_paise;
        END IF;

        UPDATE public.merchants
        SET wallet_balance_paise = v_balance_after, updated_at = NOW()
        WHERE id = v_target_merchant_id;

        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description
        ) VALUES (
            v_target_merchant_id,
            CASE WHEN p_operation = 'credit' THEN 'wallet_topup' ELSE 'withdrawal' END,
            CASE WHEN p_operation = 'credit' THEN p_amount_paise ELSE -p_amount_paise END,
            v_balance_after,
            'Admin adjustment: ' || p_reason
        ) RETURNING id INTO v_transaction_id;

    ELSIF p_wallet_type = 'customer' THEN
        SELECT id, balance_paise INTO v_target_wallet_id, v_balance_before
        FROM public.customer_wallets
        WHERE user_id = p_target_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            PERFORM set_config('app.internal_bypass', 'false', true);
            RAISE EXCEPTION 'Customer wallet not found for user';
        END IF;

        IF p_operation = 'credit' THEN
            v_balance_after := v_balance_before + p_amount_paise;
        ELSE
            IF v_balance_before < p_amount_paise THEN
                PERFORM set_config('app.internal_bypass', 'false', true);
                RAISE EXCEPTION 'Insufficient customer wallet balance';
            END IF;
            v_balance_after := v_balance_before - p_amount_paise;
        END IF;

        UPDATE public.customer_wallets
        SET balance_paise = v_balance_after, updated_at = NOW()
        WHERE id = v_target_wallet_id;

        INSERT INTO public.customer_wallet_transactions (
            wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description
        ) VALUES (
            v_target_wallet_id,
            p_target_user_id,
            CASE WHEN p_operation = 'credit' THEN 'CREDIT' ELSE 'DEBIT' END,
            p_amount_paise,
            v_balance_before,
            v_balance_after,
            'Admin adjustment: ' || p_reason
        ) RETURNING id INTO v_transaction_id;

    ELSE
        PERFORM set_config('app.internal_bypass', 'false', true);
        RAISE EXCEPTION 'Invalid wallet type: must be merchant or customer';
    END IF;

    -- 4. Audit Log
    INSERT INTO public.wallet_audit_logs (
        admin_user_id, target_user_id, wallet_type, operation,
        amount_paise, balance_before_paise, balance_after_paise,
        reason, idempotency_key, ip_address, user_agent, transaction_id
    ) VALUES (
        p_admin_user_id, p_target_user_id, p_wallet_type, p_operation,
        p_amount_paise, v_balance_before, v_balance_after,
        p_reason, p_idempotency_key, p_ip_address, p_user_agent, v_transaction_id
    ) RETURNING id INTO v_audit_log_id;

    PERFORM set_config('app.internal_bypass', 'false', true);

    RETURN json_build_object(
        'success', true,
        'duplicate', false,
        'audit_log_id', v_audit_log_id,
        'transaction_id', v_transaction_id,
        'balance_after_paise', v_balance_after
    );

EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.internal_bypass', 'false', true);
    RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.perform_wallet_adjustment(UUID, TEXT, TEXT, BIGINT, UUID, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perform_wallet_adjustment(UUID, TEXT, TEXT, BIGINT, UUID, TEXT, UUID, TEXT, TEXT) TO service_role;

COMMIT;
