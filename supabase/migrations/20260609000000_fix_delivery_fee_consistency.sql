-- ============================================================
-- 20260609000000_fix_delivery_fee_consistency.sql
-- ============================================================
-- Purpose:
--   Dynamically fetch the delivery fee from the platform_settings
--   table inside both public.customer_checkout_v4 (wallet checkout)
--   and public.draft_cart_orders (gateway checkout) to ensure
--   consistency across all payment methods.
-- ============================================================

-- ── 1. Re-define public.customer_checkout_v4 ─────────────────────────
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


-- ── 2. Re-define public.draft_cart_orders ─────────────────────────────
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
    v_delivery_fee_paise BIGINT;
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

    -- Fetch delivery fee dynamically from platform_settings
    SELECT COALESCE(value::BIGINT, 9900) INTO v_delivery_fee_paise
    FROM public.platform_settings
    WHERE key = 'delivery_fee_paise';

    IF v_delivery_fee_paise IS NULL THEN
        v_delivery_fee_paise := 9900;
    END IF;

    -- ── Totalling loop ───────────────────────────────────────────────
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

        -- Add GST
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

    -- 4. PROCESS ITEMS
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
                0,
                0
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'group_id', v_group_id, 'total_paise', v_total_paise);
END;
$function$;
