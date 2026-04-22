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
    'success',          true,
    'new_balance_paise', v_new_customer_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) TO service_role;
