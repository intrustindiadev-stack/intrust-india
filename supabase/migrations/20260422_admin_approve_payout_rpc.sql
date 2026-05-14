CREATE OR REPLACE FUNCTION admin_approve_payout(
  p_payout_request_id uuid,
  p_admin_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payout  payout_requests%ROWTYPE;
  v_balance bigint;
BEGIN
  -- 1. Lock payout row
  SELECT * INTO v_payout
  FROM payout_requests
  WHERE id = p_payout_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout request not found');
  END IF;

  -- 2. Guard: must be in 'approved' state
  IF v_payout.status != 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Payout is not in approved state: ' || v_payout.status);
  END IF;

  -- 3. Update payout status
  UPDATE payout_requests
  SET status      = 'released',
      reviewed_by = p_admin_user_id,
      reviewed_at = now()
  WHERE id = p_payout_request_id;

  -- 4. If growth fund, mark contract paid_out atomically
  IF v_payout.payout_source = 'growth_fund'
     AND v_payout.reference_id IS NOT NULL THEN
    UPDATE merchant_lockin_balances
    SET status = 'paid_out'
    WHERE id = v_payout.reference_id;
  END IF;

  -- 5. Read current (already pre-debited) wallet balance for ledger
  SELECT wallet_balance_paise INTO v_balance
  FROM merchants
  WHERE id = v_payout.merchant_id;

  -- 6. Insert merchant_transactions ledger entry
  INSERT INTO merchant_transactions (
    merchant_id,
    transaction_type,
    amount_paise,
    balance_after_paise,
    description
  ) VALUES (
    v_payout.merchant_id,
    'payout',
    (v_payout.amount * 100)::bigint,
    v_balance,
    'Payout released: ₹' || v_payout.amount::text
  );

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RAISE; -- rolls back entire transaction
END;
$$;
