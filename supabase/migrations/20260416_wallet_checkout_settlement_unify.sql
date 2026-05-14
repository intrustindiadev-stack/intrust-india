-- ============================================================
-- Migration: 20260416_wallet_checkout_settlement_unify
-- Description:
--   Implements Option B of the wallet accounting unification:
--   wallet orders are marked fully settled at checkout time so that
--   update_order_delivery_v3 (which already guards on
--   settlement_status = 'pending') correctly skips them.
--
--   Changes:
--   1. Replaces customer_checkout_v4 — merchant order branch now:
--      a. Computes commission at 30% of profit margin (consistent with
--         finalize_gateway_orders / update_finalize_gateway_orders_v2).
--      b. Persists commission_rate, platform_cut_paise, merchant_profit_paise
--         on the order group row.
--      c. Inserts settlement_status = 'settled' immediately.
--   2. Backfills existing completed wallet orders that were left in
--      settlement_status = 'pending' by the old logic.
-- ============================================================

-- ── 1. Replace customer_checkout_v4 ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.customer_checkout_v4(
    p_customer_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    v_merchant_credit    BIGINT;
    v_merchant_profit    BIGINT;
    v_total_platform_cut BIGINT := 0;
    v_delivery_fee_paise BIGINT := 5000; -- Fixed ₹50 delivery fee
BEGIN
    -- 1. Get wallet balance
    SELECT balance_paise INTO v_wallet_balance
    FROM public.customer_wallets
    WHERE user_id = p_customer_id;

    IF v_wallet_balance IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    -- 2. Get customer details from profile
    SELECT full_name, phone, address
    INTO v_customer_name, v_customer_phone, v_delivery_address
    FROM public.user_profiles
    WHERE id = p_customer_id;

    IF v_delivery_address IS NULL OR v_delivery_address = '' THEN
        SELECT full_address INTO v_delivery_address
        FROM public.kyc_records
        WHERE user_id = p_customer_id;
    END IF;

    -- 3. Identify merchant / platform, validate stock
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

    -- Calculate total and validate stock
    FOR v_cart_items IN
        SELECT
            c.*,
            COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise) AS effective_price,
            mi.stock_quantity  AS merchant_stock,
            p.admin_stock      AS platform_stock,
            p.title            AS product_title,
            p.gst_percentage   AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products  p  ON c.product_id  = p.id
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

    -- Check sufficient balance
    IF v_wallet_balance < v_total_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- 4. Create order group
    --    Merchant orders: settlement_status = 'settled' (immediate settlement at checkout).
    --    Platform orders: settlement_status remains default 'pending' (admin handles).
    INSERT INTO public.shopping_order_groups (
        customer_id,
        customer_name,
        customer_phone,
        total_amount_paise,
        status,
        delivery_status,
        merchant_id,
        is_platform_order,
        delivery_address,
        delivery_fee_paise,
        payment_method,
        settlement_status
    )
    VALUES (
        p_customer_id,
        v_customer_name,
        v_customer_phone,
        v_total_paise,
        'completed',
        'pending',
        v_merchant_id,
        v_is_platform,
        v_delivery_address,
        v_delivery_fee_paise,
        'wallet',
        CASE WHEN NOT v_is_platform THEN 'settled' ELSE 'pending' END
    )
    RETURNING id INTO v_group_id;

    -- 5. Process items
    FOR v_item IN
        SELECT
            c.*,
            COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise) AS effective_price,
            mi.merchant_id,
            p.wholesale_price_paise AS platform_cost,
            p.gst_percentage        AS gst_pct
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        JOIN  public.shopping_products  p  ON c.product_id  = p.id
        WHERE c.customer_id = p_customer_id
    LOOP
        v_item_total := v_item.effective_price * v_item.quantity;

        IF v_item.is_platform_item THEN
            -- Platform product: admin is the seller
            UPDATE public.shopping_products
            SET admin_stock = admin_stock - v_item.quantity,
                updated_at  = now()
            WHERE id = v_item.product_id;

            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id,
                quantity, unit_price_paise, cost_price_paise, profit_paise, gst_amount_paise
            ) VALUES (
                v_group_id, NULL, v_item.product_id, NULL,
                v_item.quantity, v_item.effective_price, v_item.platform_cost,
                (v_item.effective_price - COALESCE(v_item.platform_cost, 0)) * v_item.quantity,
                ROUND(v_item.effective_price * v_item.quantity
                      * COALESCE(v_item.gst_pct, 0) / 100)
            );

        ELSE
            -- Merchant product: 30% commission on profit margin (aligned with gateway flow)
            v_product_cost     := COALESCE(v_item.platform_cost, 0);
            v_commission_paise := GREATEST(0,
                (v_item.effective_price - v_product_cost) * v_item.quantity * 30 / 100);
            v_merchant_credit  := v_item_total - v_commission_paise;
            v_merchant_profit  := v_merchant_credit - (v_product_cost * v_item.quantity);

            v_total_platform_cut := v_total_platform_cut + v_commission_paise;

            UPDATE public.merchant_inventory
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at     = now()
            WHERE id = v_item.inventory_id;

            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id,
                quantity, unit_price_paise, cost_price_paise,
                profit_paise, commission_amount_paise, gst_amount_paise
            ) VALUES (
                v_group_id, v_item.merchant_id, v_item.product_id, v_item.inventory_id,
                v_item.quantity, v_item.effective_price, v_product_cost,
                v_merchant_profit, v_commission_paise,
                ROUND(v_item.effective_price * v_item.quantity
                      * COALESCE(v_item.gst_pct, 0) / 100)
            );

            -- Immediate merchant wallet credit (wallet orders settle at checkout)
            UPDATE public.merchants
            SET wallet_balance_paise        = COALESCE(wallet_balance_paise, 0)        + v_merchant_credit,
                total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_commission_paise,
                updated_at = now()
            WHERE id = v_item.merchant_id;

            INSERT INTO public.merchant_transactions (
                merchant_id, transaction_type, amount_paise,
                commission_paise, balance_after_paise, description
            ) VALUES (
                v_item.merchant_id, 'sale', v_merchant_credit,
                v_commission_paise,
                (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_item.merchant_id),
                'Order #' || substring(v_group_id::text from 1 for 8)
                    || ' profit settled — Wallet Checkout (30% profit-based commission).'
            );

            INSERT INTO public.notifications (
                user_id, title, body, type, reference_id, reference_type
            )
            SELECT user_id,
                   'New Order Received 🛒',
                   'A customer placed an order. Check your orders page.',
                   'success', v_group_id, 'shopping_order'
            FROM public.merchants
            WHERE id = v_item.merchant_id;
        END IF;
    END LOOP;

    -- 6. Persist group-level settlement fields for merchant orders
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

    -- 7. Deduct customer wallet balance
    UPDATE public.customer_wallets
    SET balance_paise = balance_paise - v_total_paise,
        updated_at    = now()
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

    -- 8. Clear cart
    DELETE FROM public.shopping_cart WHERE customer_id = p_customer_id;

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id);
END;
$$;

-- ── 2. Backfill: mark existing completed wallet orders as settled ─────────────
-- These were created by the old customer_checkout_v4 which left settlement_status
-- = 'pending' even though the merchant was already credited at checkout time.
UPDATE public.shopping_order_groups
SET settlement_status = 'settled',
    updated_at        = NOW()
WHERE status            = 'completed'
  AND payment_method    = 'wallet'
  AND settlement_status = 'pending';
