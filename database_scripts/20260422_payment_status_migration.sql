-- Step 1 — Add payment_status column
ALTER TABLE shopping_order_groups
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- Step 2 — Change status column default
ALTER TABLE shopping_order_groups
  ALTER COLUMN status SET DEFAULT 'pending';

-- Step 3 — Backfill payment_status for existing rows
UPDATE shopping_order_groups
  SET payment_status = 'paid'
  WHERE delivery_status IN ('packed', 'shipped', 'delivered');

UPDATE shopping_order_groups
  SET payment_status = 'paid'
  WHERE status = 'completed' AND payment_status = 'pending';

UPDATE shopping_order_groups
  SET payment_status = 'failed'
  WHERE status = 'failed';

-- 4. Update admin_takeover_stale_orders
CREATE OR REPLACE FUNCTION public.admin_takeover_stale_orders()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_stale_order RECORD;
    v_count INT := 0;
    v_new_platform_cut BIGINT;
    v_new_merchant_profit BIGINT;
    v_total_product_value BIGINT;
    v_total_cost_price BIGINT;
    v_total_profit BIGINT;
    v_admin_ids UUID[];
BEGIN
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.user_profiles
    WHERE role IN ('admin', 'super_admin');

    FOR v_stale_order IN 
        SELECT sog.*, m.user_id as merchant_user_id
        FROM public.shopping_order_groups sog
        JOIN public.merchants m ON sog.merchant_id = m.id
        WHERE sog.delivery_status = 'pending'
          AND sog.settlement_status = 'pending'
          AND sog.is_platform_order = false
          AND sog.payment_status = 'paid'
          AND sog.created_at < NOW() - INTERVAL '2 hours'
          AND sog.merchant_id IS NOT NULL
    LOOP
        v_total_product_value := v_stale_order.total_amount_paise - COALESCE(v_stale_order.delivery_fee_paise, 0);

        SELECT COALESCE(SUM(p.wholesale_price_paise * i.quantity), 0)
        INTO v_total_cost_price
        FROM public.shopping_order_items i
        JOIN public.shopping_products p ON i.product_id = p.id
        WHERE i.group_id = v_stale_order.id;

        v_total_profit := GREATEST(0, v_total_product_value - v_total_cost_price);
        v_new_platform_cut := ROUND(v_total_profit * 70 / 100);
        v_new_merchant_profit := v_total_product_value - v_new_platform_cut;
        
        UPDATE public.shopping_order_groups
        SET commission_rate = 0.30,
            platform_cut_paise = v_new_platform_cut,
            merchant_profit_paise = v_new_merchant_profit,
            assigned_to = NULL,
            admin_takeover_at = NOW(),
            settlement_status = 'admin_takeover'
        WHERE id = v_stale_order.id;

        UPDATE public.shopping_order_items soi
        SET commission_amount_paise = GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100,
            profit_paise = (soi.unit_price_paise * soi.quantity)
                           - GREATEST(0, (soi.unit_price_paise - COALESCE(p.wholesale_price_paise, 0))) * soi.quantity * 70 / 100
                           - (COALESCE(p.wholesale_price_paise, 0) * soi.quantity)
        FROM public.shopping_products p
        WHERE soi.product_id = p.id
          AND soi.group_id = v_stale_order.id;

        UPDATE public.merchants
        SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + v_new_merchant_profit,
            total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_new_platform_cut
        WHERE id = v_stale_order.merchant_id;

        INSERT INTO public.merchant_transactions (
           merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
        ) VALUES (
           v_stale_order.merchant_id, 'sale', v_new_merchant_profit, v_new_platform_cut,
           (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_stale_order.merchant_id),
           'Order auto-escalated to admin — merchant did not respond within 2 hours. 70% of profit taken as platform fee.'
        );

        INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
        VALUES (
            v_stale_order.merchant_user_id, 
            'Order Reassigned ⚠️', 
            'Order #' || substring(v_stale_order.id::text from 1 for 8) || ' was reassigned to admin due to inactivity. Your commission reduced to 30%.', 
            'warning', 
            v_stale_order.id, 
            'shopping_order'
        );

        IF array_length(v_admin_ids, 1) > 0 THEN
            INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
            SELECT unnest(v_admin_ids), 'Order Takeover 📋', 'Order #' || substring(v_stale_order.id::text from 1 for 8) || ' auto-transferred. Merchant did not respond within 2 hours.', 'info', v_stale_order.id, 'shopping_order';
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'orders_transferred', v_count);
END;
$function$;

-- 5. Update customer_checkout_v4
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
    v_merchant_credit    BIGINT;
    v_merchant_profit    BIGINT;
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

    IF v_wallet_balance < v_total_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    INSERT INTO public.shopping_order_groups (
        customer_id, customer_name, customer_phone,
        total_amount_paise, status, payment_status, delivery_status,
        merchant_id, is_platform_order, delivery_address,
        delivery_fee_paise, payment_method, settlement_status
    )
    VALUES (
        p_customer_id, v_customer_name, v_customer_phone,
        v_total_paise, 'pending', 'paid', 'pending',
        v_merchant_id, v_is_platform, v_delivery_address,
        v_delivery_fee_paise, 'wallet',
        CASE WHEN NOT v_is_platform THEN 'settled' ELSE 'pending' END
    )
    RETURNING id INTO v_group_id;

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
            -- 30% commission on profit margin (aligned with gateway flow)
            v_product_cost     := COALESCE(v_item.platform_cost, 0);
            v_commission_paise := GREATEST(0,
                (v_item.effective_price - v_product_cost) * v_item.quantity * 30 / 100);
            v_merchant_credit  := v_item_total - v_commission_paise;
            v_merchant_profit  := v_merchant_credit - (v_product_cost * v_item.quantity);
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
                v_merchant_profit, v_commission_paise,
                ROUND(v_item.effective_price * v_item.quantity * COALESCE(v_item.gst_pct, 0) / 100)
            );

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

-- 6. Update finalize_gateway_orders
CREATE OR REPLACE FUNCTION public.finalize_gateway_orders(p_group_id uuid, p_customer_id uuid, p_amount_paise bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_group RECORD;
    v_item RECORD;
    v_item_total BIGINT;
    v_commission_paise BIGINT;
    v_merchant_credit BIGINT;
    v_product_cost BIGINT;
    v_merchant_profit BIGINT;
    v_total_platform_cut BIGINT := 0;
BEGIN
    SELECT * INTO v_group FROM public.shopping_order_groups WHERE id = p_group_id AND customer_id = p_customer_id AND payment_status = 'pending';
    
    IF v_group.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or already processed order group');
    END IF;

    IF v_group.total_amount_paise != p_amount_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Amount mismatch');
    END IF;

    -- Update order group to paid
    UPDATE public.shopping_order_groups SET payment_status = 'paid' WHERE id = p_group_id;

    -- Process items
    FOR v_item IN 
        SELECT i.*, p.admin_stock, p.wholesale_price_paise, mi.stock_quantity as merchant_stock
        FROM public.shopping_order_items i
        JOIN public.shopping_products p ON i.product_id = p.id
        LEFT JOIN public.merchant_inventory mi ON i.inventory_id = mi.id
        WHERE i.group_id = p_group_id
    LOOP
        v_item_total := v_item.unit_price_paise * v_item.quantity;

        IF v_group.is_platform_order THEN
            -- Platform Order: Admin is the seller
            UPDATE public.shopping_products 
            SET admin_stock = admin_stock - v_item.quantity,
                updated_at = now()
            WHERE id = v_item.product_id;
        ELSE
            -- CORRECT FORMULA: Commission on profit margin only
            v_product_cost := COALESCE(v_item.wholesale_price_paise, 0);
            v_commission_paise := GREATEST(0, (v_item.unit_price_paise - v_product_cost)) * v_item.quantity * 30 / 100;
            v_total_platform_cut := v_total_platform_cut + v_commission_paise;
            v_merchant_credit := v_item_total - v_commission_paise;

            -- Merchant's pure margin profit = credit received minus inventory cost
            v_merchant_profit := v_merchant_credit - (v_product_cost * v_item.quantity);

            UPDATE public.merchant_inventory 
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at = now()
            WHERE id = v_item.inventory_id;

            -- Update item stats for ledger
            UPDATE public.shopping_order_items
            SET cost_price_paise = v_product_cost, 
                profit_paise = v_merchant_profit,   
                commission_amount_paise = v_commission_paise 
            WHERE id = v_item.id;

            INSERT INTO public.notifications (user_id, title, body, type, reference_id, reference_type)
            SELECT user_id, 'New Order Received 🛒', 'Order #' || substring(p_group_id::text from 1 for 8) || ' has been paid.', 'success', p_group_id, 'shopping_order'
            FROM public.merchants 
            WHERE id = v_item.seller_id;
        END IF;
    END LOOP;

    -- Aggregate Commission Data on Group (if merchant order)
    IF NOT v_group.is_platform_order THEN
        UPDATE public.shopping_order_groups 
        SET commission_rate = 0.30,
            platform_cut_paise = v_total_platform_cut,
            merchant_profit_paise = (
                SELECT SUM((i.unit_price_paise - COALESCE(p.wholesale_price_paise, 0)) * i.quantity) - v_total_platform_cut
                FROM public.shopping_order_items i
                JOIN public.shopping_products p ON i.product_id = p.id
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

-- 7. Update update_order_delivery_v3 (shopping)
CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(p_order_id uuid, p_new_status text, p_tracking_number text, p_estimated_at timestamp with time zone, p_status_notes text, p_is_admin boolean DEFAULT false, p_is_merchant boolean DEFAULT false, p_is_customer boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order       RECORD;
    v_user_id     uuid;
    v_caller_role text;
    v_payout      BIGINT;
BEGIN
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Authorization
    IF p_is_admin THEN
        SELECT role INTO v_caller_role
        FROM public.user_profiles
        WHERE id = v_user_id;

        IF v_caller_role NOT IN ('admin', 'super_admin') THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;

    ELSIF p_is_merchant THEN
        IF v_order.merchant_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.merchants
                WHERE id = v_order.merchant_id AND user_id = v_user_id
            ) THEN
                RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
            END IF;
        END IF;

    ELSIF p_is_customer THEN
        IF v_order.customer_id != v_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;

    ELSE
        RETURN json_build_object('success', false, 'message', 'Unauthorized: Missing role flag');
    END IF;

    -- Apply delivery status update
    UPDATE public.shopping_order_groups
    SET delivery_status       = p_new_status,
        tracking_number       = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes          = p_status_notes,
        updated_at            = NOW()
    WHERE id = p_order_id;

    -- Settlement logic
    -- Eligibility: completed payment, merchant order, pending settlement, delivery progressing
    IF  v_order.payment_status    = 'paid'
    AND v_order.merchant_id       IS NOT NULL
    AND v_order.settlement_status = 'pending'
    AND v_order.delivery_status   = 'pending'
    AND p_new_status IN ('packed', 'shipped', 'delivered')
    AND p_is_merchant = true
    THEN
        v_payout := COALESCE(v_order.merchant_profit_paise, 0);

        IF v_payout <= 0 THEN
            -- Zero / negative payout: mark terminal, skip wallet & ledger
            UPDATE public.shopping_order_groups
            SET settlement_status = 'settled_zero',
                updated_at        = NOW()
            WHERE id = p_order_id;

        ELSE
            -- Positive payout: credit wallet and write ledger row
            UPDATE public.merchants
            SET wallet_balance_paise        = COALESCE(wallet_balance_paise, 0)        + v_payout,
                total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + COALESCE(v_order.platform_cut_paise, 0),
                updated_at = NOW()
            WHERE id = v_order.merchant_id;

            INSERT INTO public.merchant_transactions (
                merchant_id,
                transaction_type,
                amount_paise,
                commission_paise,
                balance_after_paise,
                description
            ) VALUES (
                v_order.merchant_id,
                'sale',
                v_payout,
                COALESCE(v_order.platform_cut_paise, 0),
                (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
                'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Merchant kept 70% profit share).'
            );

            UPDATE public.shopping_order_groups
            SET settlement_status = 'settled',
                updated_at        = NOW()
            WHERE id = p_order_id;
        END IF;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$function$;
