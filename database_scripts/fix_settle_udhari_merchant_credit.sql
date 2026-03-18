-- =========================================================
-- FIX: settle_udhari_payment — add missing merchant wallet credit
--
-- Root cause: The original RPC debited the customer wallet but
-- never credited the merchant's wallet_balance_paise on the
-- merchants table. The merchant_transactions insert was a pure
-- log entry with no actual balance mutation.
--
-- Fix:
--   • Step 5b: UPDATE merchants SET wallet_balance_paise += amount_paise
--   • Step 9:  Populate balance_after_paise in merchant_transactions
-- =========================================================

CREATE OR REPLACE FUNCTION public.settle_udhari_payment(
  p_udhari_request_id uuid,
  p_customer_user_id uuid,
  p_extra_fee_paise bigint,
  p_customer_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_udhari record;
  v_wallet record;
  v_coupon record;
  v_total_paise bigint;
  v_order_id uuid;
  v_merchant_new_balance bigint;
BEGIN
  -- 1. Lock & fetch the udhari request
  SELECT * INTO v_udhari
  FROM udhari_requests
  WHERE id = p_udhari_request_id
    AND customer_id = p_customer_user_id
    AND status = 'approved'
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

  -- 3. Compute amounts
  v_total_paise := v_udhari.amount_paise + p_extra_fee_paise;
  IF v_wallet.balance_paise < v_total_paise THEN
    RAISE EXCEPTION 'insufficient_balance:%', v_wallet.balance_paise;
  END IF;

  -- 4. Lock & verify coupon
  SELECT * INTO v_coupon
  FROM coupons
  WHERE id = v_udhari.coupon_id
    AND status = 'reserved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'coupon_not_reserved';
  END IF;

  -- 5. Deduct customer wallet
  UPDATE customer_wallets
  SET balance_paise = balance_paise - v_total_paise
  WHERE id = v_wallet.id;

  -- 5b. Credit merchant wallet (principal + extra_fee is now credited to merchant)
  -- Use SELECT FOR UPDATE to lock the row before computing the new balance,
  -- preventing any concurrent topup/payout from racing with this credit.
  SELECT wallet_balance_paise INTO v_merchant_new_balance
  FROM merchants
  WHERE id = v_udhari.merchant_id
  FOR UPDATE;

  v_merchant_new_balance := COALESCE(v_merchant_new_balance, 0) + v_total_paise;

  UPDATE merchants
  SET wallet_balance_paise = v_merchant_new_balance,
      updated_at = NOW()
  WHERE id = v_udhari.merchant_id;

  -- 6. Mark coupon sold
  UPDATE coupons
  SET status = 'sold',
      purchased_by = p_customer_user_id,
      purchased_at = NOW()
  WHERE id = v_coupon.id;

  -- 7. Insert order
  INSERT INTO orders (
    user_id, merchant_id, giftcard_id, amount, payment_status, created_at
  ) VALUES (
    p_customer_user_id, v_udhari.merchant_id, v_coupon.id, v_total_paise, 'paid', NOW()
  ) RETURNING id INTO v_order_id;

  -- 8. Insert customer wallet ledger
  INSERT INTO customer_wallet_transactions (
    wallet_id, user_id, type, amount_paise,
    balance_before_paise, balance_after_paise,
    description, reference_id, reference_type
  ) VALUES (
    v_wallet.id, p_customer_user_id, 'DEBIT', v_total_paise,
    v_wallet.balance_paise, v_wallet.balance_paise - v_total_paise,
    'Udhari Settlement: ' || COALESCE(v_coupon.brand, 'Gift Card') || ' - ' || COALESCE(v_coupon.title, '') ||
    CASE WHEN p_extra_fee_paise > 0 THEN ' (incl. ₹' || (p_extra_fee_paise / 100.0)::numeric(10,2)::text || ' fee)' ELSE '' END,
    p_udhari_request_id, 'UDHARI_PAYMENT'
  );

  -- 9. Insert merchant transaction ledger (with accurate balance_after_paise)
  INSERT INTO merchant_transactions (
    merchant_id, transaction_type, amount_paise, commission_paise,
    balance_after_paise, description, metadata
  ) VALUES (
    v_udhari.merchant_id, 'udhari_payment', v_total_paise, 0,
    v_merchant_new_balance,
    'Udhari Paid: ' || COALESCE(v_coupon.title, 'Gift Card') || COALESCE(' (Cust: ' || p_customer_email || ')', ''),
    jsonb_build_object(
      'udhari_request_id', p_udhari_request_id,
      'customer_id', p_customer_user_id,
      'coupon_id', v_coupon.id
    )
  );

  -- 10. Mark udhari completed
  UPDATE udhari_requests
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_udhari_request_id;

  -- 11. Return success response
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'new_balance_paise', v_wallet.balance_paise - v_total_paise
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_udhari_payment(uuid, uuid, bigint, text) TO service_role;
