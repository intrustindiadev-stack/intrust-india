-- =========================================================
-- STORE CREDITS SHOP EXTENSION
-- Extends Udhari (deferred payment) to cover shop orders
-- in addition to existing gift card (udhari) flow.
-- Run this migration in the Supabase SQL editor.
-- =========================================================

-- 1. Add source_type column to udhari_requests
--    'gift_card'  = existing gift-card Udhari (default, backward-compatible)
--    'shop_order' = new physical-product cart checkout via store credit
ALTER TABLE public.udhari_requests
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'gift_card'
    CHECK (source_type IN ('gift_card', 'shop_order'));

-- 2. Add nullable FK to shopping_order_groups for shop-order credits
ALTER TABLE public.udhari_requests
  ADD COLUMN IF NOT EXISTS shopping_order_group_id UUID
    REFERENCES public.shopping_order_groups(id) ON DELETE SET NULL;

-- 3. Make coupon_id nullable (shop orders don't involve a coupon)
ALTER TABLE public.udhari_requests
  ALTER COLUMN coupon_id DROP NOT NULL;

-- 4. Add 'store_credit' and 'pending_credit' to shopping_order_groups
--    payment_method constraint — drop old, recreate with new values
ALTER TABLE public.shopping_order_groups
  DROP CONSTRAINT IF EXISTS shopping_order_groups_payment_method_check;

ALTER TABLE public.shopping_order_groups
  ADD CONSTRAINT shopping_order_groups_payment_method_check
    CHECK (payment_method IN ('wallet', 'gateway', 'cod', 'store_credit'));

-- 5. Add 'pending_credit' delivery status for orders awaiting credit approval
ALTER TABLE public.shopping_order_groups
  DROP CONSTRAINT IF EXISTS shopping_order_groups_delivery_status_check;

ALTER TABLE public.shopping_order_groups
  ADD CONSTRAINT shopping_order_groups_delivery_status_check
    CHECK (delivery_status IN ('pending', 'packed', 'shipped', 'delivered', 'cancelled', 'pending_credit'));

-- 6. Update merchant_transactions constraint to include 'store_credit_payment'
ALTER TABLE public.merchant_transactions 
  DROP CONSTRAINT IF EXISTS merchant_transactions_transaction_type_check,
  ADD CONSTRAINT merchant_transactions_transaction_type_check 
    CHECK (transaction_type IN ('purchase', 'sale', 'commission', 'wallet_topup', 'withdrawal', 'udhari_payment', 'store_credit_payment'));

-- 6. Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_udhari_requests_source_type
  ON public.udhari_requests(source_type);

CREATE INDEX IF NOT EXISTS idx_udhari_requests_order_group
  ON public.udhari_requests(shopping_order_group_id);

-- 7. RLS: allow customers to INSERT shop-order udhari requests
--    (gift-card inserts are handled by RPCs with SECURITY DEFINER;
--     we add a policy so the new RPC can also work via anon auth path)
DROP POLICY IF EXISTS "customers_insert_shop_udhari" ON public.udhari_requests;
CREATE POLICY "customers_insert_shop_udhari" ON public.udhari_requests
  FOR INSERT WITH CHECK (
    auth.uid() = customer_id
    AND source_type = 'shop_order'
  );

-- =========================================================
-- 8. RPC: request_store_credit_for_cart
--    Called by /api/shopping/request-store-credit
-- =========================================================
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

GRANT EXECUTE ON FUNCTION public.request_store_credit_for_cart(uuid, uuid, uuid, bigint, int) TO service_role;

-- =========================================================
-- 9. RPC: settle_store_credit_for_cart
--    Called by /api/shopping/settle-store-credit
--    Mirrors settle_udhari_payment but for shop orders
-- =========================================================
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
  SET delivery_status  = 'pending',
      payment_method   = 'store_credit'
  WHERE id = v_udhari.shopping_order_group_id;

  -- 7. Mark udhari as completed
  UPDATE udhari_requests
  SET status       = 'completed',
      completed_at = NOW()
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
    'success',          true,
    'new_balance_paise', v_new_customer_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) TO service_role;

-- =========================================================
-- 10. RPC: respond_store_credit_request
--     Merchant approves/denies a shop-order store credit request
-- =========================================================
CREATE OR REPLACE FUNCTION public.respond_store_credit_request(
  p_udhari_request_id  uuid,
  p_merchant_user_id   uuid,
  p_action             text,   -- 'approve' or 'deny'
  p_duration_days      int     DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_udhari      record;
  v_merchant    record;
  v_due_date    timestamptz;
BEGIN
  -- Resolve merchant from user_id
  SELECT * INTO v_merchant
  FROM merchants
  WHERE user_id = p_merchant_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'merchant_not_found';
  END IF;

  -- Fetch the pending request
  SELECT * INTO v_udhari
  FROM udhari_requests
  WHERE id = p_udhari_request_id
    AND merchant_id = v_merchant.id
    AND status = 'pending'
    AND source_type = 'shop_order'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found_or_already_processed';
  END IF;

  IF p_action = 'approve' THEN
    v_due_date := NOW() + (COALESCE(p_duration_days, v_udhari.duration_days) || ' days')::interval;

    UPDATE udhari_requests
    SET status        = 'approved',
        due_date      = v_due_date,
        responded_at  = NOW()
    WHERE id = p_udhari_request_id;

    RETURN jsonb_build_object('success', true, 'action', 'approved', 'due_date', v_due_date);

  ELSIF p_action = 'deny' THEN
    -- Revert the order group back to pending so customer can pick another payment
    UPDATE shopping_order_groups
    SET payment_method  = NULL,
        delivery_status = 'pending'
    WHERE id = v_udhari.shopping_order_group_id;

    UPDATE udhari_requests
    SET status       = 'denied',
        responded_at = NOW()
    WHERE id = p_udhari_request_id;

    RETURN jsonb_build_object('success', true, 'action', 'denied');

  ELSE
    RAISE EXCEPTION 'invalid_action';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_store_credit_request(uuid, uuid, text, int) TO service_role;
