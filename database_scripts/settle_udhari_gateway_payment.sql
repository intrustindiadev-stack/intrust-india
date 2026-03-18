-- =========================================================
-- settle_udhari_gateway_payment
--
-- Purpose: Settle an Udhari request that was paid via an external
-- payment gateway (SabPaisa UPI / Card). The gateway already
-- collected funds, so we MUST NOT debit the customer's wallet.
--
-- Steps:
--   1. Lock & verify the udhari request (approved, correct customer)
--   2. Lock & verify the coupon (must still be reserved)
--   3. Mark coupon as sold
--   4. Insert order record
--   5. Credit merchant wallet (principal amount only)
--   6. Insert merchant ledger entry with accurate balance_after_paise
--   7. Mark udhari request as completed
--
-- Explicitly does NOT touch customer_wallets or
-- customer_wallet_transactions — billing was handled by the gateway.
-- =========================================================

CREATE OR REPLACE FUNCTION public.settle_udhari_gateway_payment(
  p_udhari_request_id  uuid,
  p_customer_user_id   uuid,
  p_amount_paise       bigint,
  p_customer_email     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_udhari               record;
  v_coupon               record;
  v_order_id             uuid;
  v_merchant_new_balance bigint;
BEGIN
  -- 1. Lock & fetch the udhari request
  SELECT * INTO v_udhari
  FROM udhari_requests
  WHERE id             = p_udhari_request_id
    AND customer_id    = p_customer_user_id
    AND status         = 'approved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'udhari_not_found';
  END IF;

  -- 2. Lock & verify the coupon is still reserved
  SELECT * INTO v_coupon
  FROM coupons
  WHERE id     = v_udhari.coupon_id
    AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_reserved';
  END IF;

  -- 3. Mark coupon as sold
  UPDATE coupons
  SET status       = 'sold',
      purchased_by = p_customer_user_id,
      purchased_at = NOW()
  WHERE id = v_coupon.id;

  -- 4. Insert order record
  INSERT INTO orders (
    user_id, merchant_id, giftcard_id, amount, payment_status, created_at
  ) VALUES (
    p_customer_user_id, v_udhari.merchant_id, v_coupon.id,
    p_amount_paise, 'paid', NOW()
  ) RETURNING id INTO v_order_id;

  -- 5. Credit merchant wallet
  -- Use SELECT FOR UPDATE to prevent concurrent race with topup/payout.
  SELECT wallet_balance_paise INTO v_merchant_new_balance
  FROM merchants
  WHERE id = v_udhari.merchant_id
  FOR UPDATE;

  -- Credit the full amount (including convenience fee) to merchant wallet
  v_merchant_new_balance := COALESCE(v_merchant_new_balance, 0) + p_amount_paise;

  UPDATE merchants
  SET wallet_balance_paise = v_merchant_new_balance,
      updated_at           = NOW()
  WHERE id = v_udhari.merchant_id;

  -- 6. Insert merchant ledger entry
  INSERT INTO merchant_transactions (
    merchant_id, transaction_type, amount_paise, commission_paise,
    balance_after_paise, description, metadata
  ) VALUES (
    v_udhari.merchant_id,
    'udhari_gateway_payment',
    p_amount_paise,
    0,
    v_merchant_new_balance,
    'Udhari Paid (Gateway): ' ||
      COALESCE(v_coupon.title, 'Gift Card') ||
      COALESCE(' (Cust: ' || p_customer_email || ')', ''),
    jsonb_build_object(
      'udhari_request_id', p_udhari_request_id,
      'customer_id',       p_customer_user_id,
      'coupon_id',         v_coupon.id,
      'gateway_amount_paise', p_amount_paise
    )
  );

  -- 7. Mark udhari request completed
  UPDATE udhari_requests
  SET status       = 'completed',
      completed_at = NOW()
  WHERE id = p_udhari_request_id;

  -- Return success payload
  RETURN jsonb_build_object(
    'success',              true,
    'order_id',             v_order_id,
    'merchant_new_balance', v_merchant_new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_udhari_gateway_payment(uuid, uuid, bigint, text) TO service_role;
