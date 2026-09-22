-- Migration: 20260917010000_fix_checkout_order_guard_and_customer_checkout.sql
-- Description:
--   1. Fix order_groups_merchant_update_guard so regular customers (non-merchants)
--      and system procedures are never blocked from updating order groups (e.g. during Store Credit requests).
--   2. Restore canonical customer_checkout_v4 RPC which defers merchant settlement to order fulfillment
--      and eliminates the obsolete direct update to merchants.wallet_balance_paise during cart checkout.
--   3. Add internal bypass flag to request_store_credit_for_cart and settle_store_credit_for_cart to prevent
--      trigger interference during credit request & settlement workflows.

BEGIN;

-- ── 1. Fix order_groups_merchant_update_guard ────────────────────────────────
CREATE OR REPLACE FUNCTION public.order_groups_merchant_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    user_role text;
BEGIN
    -- Allow explicit internal bypass or service_role
    IF current_setting('app.internal_bypass', true) = 'true'
       OR current_setting('role', true) = 'service_role'
    THEN
        RETURN NEW;
    END IF;

    -- 1. Get the role of the authenticated user
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE id = auth.uid();

    -- 2. If no authenticated user (direct migration/DB query) or not a merchant, allow update
    IF user_role IS NULL OR user_role != 'merchant' THEN
        RETURN NEW;
    END IF;

    -- 3. If the user is the customer who placed this order, allow update
    IF auth.uid() = OLD.customer_id THEN
        RETURN NEW;
    END IF;

    -- 4. Restrict columns for merchants ONLY
    IF NEW.merchant_profit_paise IS DISTINCT FROM OLD.merchant_profit_paise OR
       NEW.platform_cut_paise IS DISTINCT FROM OLD.platform_cut_paise OR
       NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR
       NEW.settlement_status IS DISTINCT FROM OLD.settlement_status OR
       NEW.total_amount_paise IS DISTINCT FROM OLD.total_amount_paise OR
       NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
       NEW.merchant_id IS DISTINCT FROM OLD.merchant_id OR
       NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
       NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.assigned_to IS DISTINCT FROM OLD.assigned_to OR
       NEW.admin_takeover_at IS DISTINCT FROM OLD.admin_takeover_at OR
       NEW.delivery_fee_paise IS DISTINCT FROM OLD.delivery_fee_paise OR
       NEW.is_platform_order IS DISTINCT FROM OLD.is_platform_order OR
       NEW.client_txn_id IS DISTINCT FROM OLD.client_txn_id
    THEN
        RAISE EXCEPTION 'Restricted column update detected. Merchants can only update delivery status, tracking number, and notes.';
    END IF;

    RETURN NEW;
END;
$function$;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS order_groups_merchant_column_guard ON public.shopping_order_groups;
CREATE TRIGGER order_groups_merchant_column_guard
    BEFORE UPDATE ON public.shopping_order_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.order_groups_merchant_update_guard();


-- ── 2. Restore Canonical customer_checkout_v4 ─────────────────────────────────
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
    -- Bypass internal triggers for system operations
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- AUTHORIZATION
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
        LEFT JOIN public.fashion_variants fv ON c.variant_id = fv.id
        JOIN  public.shopping_products      p  ON c.product_id  = p.id
        WHERE c.customer_id = v_customer_id
    LOOP
        v_total_paise := v_total_paise
            + (v_cart_items.effective_price * v_cart_items.quantity)
            + ROUND(v_cart_items.effective_price * v_cart_items.quantity
                    * COALESCE(v_cart_items.gst_pct, 0) / 100);

        IF v_cart_items.variant_id IS NOT NULL THEN
            IF v_cart_items.variant_stock < v_cart_items.quantity THEN
                RETURN jsonb_build_object('success', false, 'message',
                    'Insufficient stock for variant of ' || v_cart_items.product_title);
            END IF;
        ELSIF v_cart_items.is_platform_item THEN
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
            CASE 
                 WHEN c.variant_id IS NOT NULL THEN fv.price_paise
                 WHEN c.is_platform_item THEN COALESCE(p.platform_price_paise, p.suggested_retail_price_paise)
                 ELSE COALESCE(NULLIF(mi.retail_price_paise, 0), p.suggested_retail_price_paise)
            END                    AS effective_price,
            mi.merchant_id,
            mi.id                  AS inventory_id,
            p.wholesale_price_paise AS platform_cost,
            p.gst_percentage       AS gst_pct,
            fv.sku, fv.size, fv.color, fv.fit, fv.fabric
        FROM public.shopping_cart c
        LEFT JOIN public.merchant_inventory mi ON c.inventory_id = mi.id
        LEFT JOIN public.fashion_variants fv ON c.variant_id = fv.id
        JOIN  public.shopping_products      p  ON c.product_id  = p.id
        WHERE c.customer_id = v_customer_id
    LOOP
        v_item_total := v_item.effective_price * v_item.quantity;

        IF v_item.variant_id IS NOT NULL THEN
            -- Deduct stock from fashion_variants ATOMICALLY
            UPDATE public.fashion_variants
            SET inventory_quantity = inventory_quantity - v_item.quantity, updated_at = now()
            WHERE id = v_item.variant_id AND inventory_quantity >= v_item.quantity;
            
            IF NOT FOUND THEN
               RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock during checkout for variant.');
            END IF;

            INSERT INTO public.shopping_order_items (
                group_id, seller_id, product_id, inventory_id, variant_id, variant_snapshot,
                quantity, unit_price_paise, cost_price_paise, profit_paise, gst_amount_paise
            ) VALUES (
                v_group_id, NULL, v_item.product_id, NULL, v_item.variant_id, 
                jsonb_build_object('sku', v_item.sku, 'size', v_item.size, 'color', v_item.color, 'fit', v_item.fit, 'fabric', v_item.fabric),
                v_item.quantity, v_item.effective_price, v_item.platform_cost,
                (v_item.effective_price - COALESCE(v_item.platform_cost, 0)) * v_item.quantity,
                ROUND(v_item.effective_price * v_item.quantity * COALESCE(v_item.gst_pct, 0) / 100)
            );

        ELSIF v_item.is_platform_item AND v_item.merchant_id IS NULL THEN
            -- Platform direct item
            UPDATE public.shopping_products
            SET admin_stock = admin_stock - v_item.quantity, updated_at = now()
            WHERE id = v_item.product_id AND admin_stock >= v_item.quantity;
            
            IF NOT FOUND THEN
               RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock during checkout for product.');
            END IF;

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
            WHERE id = v_item.inventory_id AND stock_quantity >= v_item.quantity;
            
            IF NOT FOUND THEN
               RETURN jsonb_build_object('success', false, 'message', 'Insufficient stock during checkout for merchant item.');
            END IF;

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

REVOKE EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.customer_checkout_v4(uuid) TO service_role;


-- ── 3. Update request_store_credit_for_cart with internal bypass ───────────────
CREATE OR REPLACE FUNCTION public.request_store_credit_for_cart(
  p_customer_id       uuid,
  p_group_id          uuid,
  p_merchant_id       uuid,
  p_amount_paise      bigint,
  p_duration_days     int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group       record;
  v_udhari_id   uuid;
BEGIN
  -- Set internal bypass flag to avoid trigger collision
  PERFORM set_config('app.internal_bypass', 'true', true);

  -- 1. Validate the draft order group belongs to customer and is in a valid pre-payment state
  SELECT * INTO v_group
  FROM shopping_order_groups
  WHERE id = p_group_id
    AND customer_id = p_customer_id
    AND (payment_method IS NULL OR payment_method IN ('store_credit', 'gateway'))
    AND delivery_status IN ('pending', 'pending_credit')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_group_not_found_or_invalid';
  END IF;

  -- 2. Validate duration_days
  IF p_duration_days NOT IN (5, 10, 15) THEN
    RAISE EXCEPTION 'invalid_duration_days';
  END IF;

  -- 3. Insert udhari request for shop order
  INSERT INTO udhari_requests (
    customer_id,
    merchant_id,
    coupon_id,
    amount_paise,
    status,
    duration_days,
    source_type,
    shopping_order_group_id,
    disclaimer_accepted,
    requested_at
  ) VALUES (
    p_customer_id,
    p_merchant_id,
    NULL,           -- no coupon for shop orders
    p_amount_paise,
    'pending',
    p_duration_days,
    'shop_order',
    p_group_id,
    true,
    NOW()
  )
  RETURNING id INTO v_udhari_id;

  -- 4. Mark the order group as pending_credit with store_credit payment method
  UPDATE shopping_order_groups
  SET payment_method   = 'store_credit',
      delivery_status  = 'pending_credit'
  WHERE id = p_group_id;

  -- 5. Return result
  RETURN jsonb_build_object(
    'success',            true,
    'udhari_request_id',  v_udhari_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_store_credit_for_cart(uuid, uuid, uuid, bigint, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_store_credit_for_cart(uuid, uuid, uuid, bigint, int) TO service_role;


-- ── 4. Update settle_store_credit_for_cart with internal bypass ───────────────
CREATE OR REPLACE FUNCTION public.settle_store_credit_for_cart(
  p_udhari_request_id  uuid,
  p_customer_user_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_udhari    record;
  v_wallet    record;
  v_group     record;
  v_fee_paise bigint;
  v_total     bigint;
  v_merchant_new_balance bigint;
  v_new_customer_balance bigint;
BEGIN
  -- Set internal bypass flag to avoid trigger collision
  PERFORM set_config('app.internal_bypass', 'true', true);

  -- 1. Lock & fetch the udhari request
  SELECT * INTO v_udhari
  FROM udhari_requests
  WHERE id = p_udhari_request_id
    AND customer_id = p_customer_user_id
    AND status = 'approved'
    AND source_type = 'shop_order'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'udhari_not_found';
  END IF;

  -- 2. Lock & fetch the customer wallet
  SELECT * INTO v_wallet
  FROM customer_wallets
  WHERE user_id = p_customer_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  -- 3. Fetch the order group
  SELECT * INTO v_group
  FROM shopping_order_groups
  WHERE id = v_udhari.shopping_order_group_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_group_not_found';
  END IF;

  -- 4. Compute convenience fee (3% of principal)
  v_fee_paise := ROUND(v_udhari.amount_paise * 0.03);
  v_total     := v_udhari.amount_paise + v_fee_paise;

  IF v_wallet.balance_paise < v_total THEN
    RAISE EXCEPTION 'insufficient_balance:%', v_wallet.balance_paise;
  END IF;

  -- 5. Deduct wallet
  UPDATE customer_wallets
  SET balance_paise = balance_paise - v_total
  WHERE id = v_wallet.id
  RETURNING balance_paise INTO v_new_customer_balance;

  -- 6. Mark order group as confirmed (pending → merchant to fulfill)
  UPDATE shopping_order_groups
  SET delivery_status    = 'pending',
      payment_method     = 'store_credit',
      total_amount_paise = v_total
  WHERE id = v_udhari.shopping_order_group_id;

  -- 7. Mark udhari as completed
  UPDATE udhari_requests
  SET status       = 'completed',
      completed_at = NOW(),
      fee_paise    = v_fee_paise
  WHERE id = p_udhari_request_id;

  -- Credit the merchant wallet and compute balance_after_paise
  SELECT wallet_balance_paise INTO v_merchant_new_balance 
  FROM merchants 
  WHERE id = v_udhari.merchant_id FOR UPDATE;

  v_merchant_new_balance := COALESCE(v_merchant_new_balance, 0) + v_udhari.amount_paise;

  UPDATE merchants 
  SET wallet_balance_paise = v_merchant_new_balance, 
      updated_at = NOW() 
  WHERE id = v_udhari.merchant_id;

  -- 8. Insert customer wallet transaction
  INSERT INTO customer_wallet_transactions (
    wallet_id, user_id, type, amount_paise,
    balance_before_paise, balance_after_paise,
    description, reference_id, reference_type
  ) VALUES (
    v_wallet.id, p_customer_user_id, 'DEBIT', v_total,
    v_wallet.balance_paise, v_wallet.balance_paise - v_total,
    'Store Credit Settlement: Shop Order #' || LEFT(v_udhari.shopping_order_group_id::text, 8) ||
      ' (incl. ₹' || (v_fee_paise / 100.0)::numeric(10,2)::text || ' fee)',
    p_udhari_request_id, 'STORE_CREDIT_PAYMENT'
  );

  -- 9. Insert merchant transaction ledger
  INSERT INTO merchant_transactions (
    merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise,
    description, metadata
  ) VALUES (
    v_udhari.merchant_id, 'store_credit_payment', v_udhari.amount_paise, 0, v_merchant_new_balance,
    'Store Credit Paid: Shop Order #' || LEFT(v_udhari.shopping_order_group_id::text, 8),
    jsonb_build_object(
      'udhari_request_id',       p_udhari_request_id,
      'customer_id',             p_customer_user_id,
      'shopping_order_group_id', v_udhari.shopping_order_group_id
    )
  );

  -- 10. Return success
  RETURN jsonb_build_object(
    'success',                  true,
    'customer_balance_paise',   v_new_customer_balance,
    'merchant_balance_paise',   v_merchant_new_balance,
    'fee_paise',                v_fee_paise
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) TO service_role;

COMMIT;
