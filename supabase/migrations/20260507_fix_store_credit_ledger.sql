-- =========================================================
-- MIGRATION: 20260507_fix_store_credit_ledger.sql
--
-- PURPOSE:
--   The previous settle_store_credit_for_cart credited the merchant
--   wallet with the gross udhari amount and wrote commission_paise = 0,
--   leaving all ledger columns (cost_price_paise, profit_paise,
--   commission_amount_paise on items; commission_rate, platform_cut_paise,
--   merchant_profit_paise, settlement_status on the order group) empty.
--   This caused the merchant order list to show ₹0 everywhere.
--
-- SECTIONS:
--   A — Replace settle_store_credit_for_cart with correct ledger logic
--   B — One-time backfill of existing store-credit orders (ledger only)
--   C — Re-emit respond_store_credit_request with intent comments
-- =========================================================


-- =========================================================
-- SECTION A: CREATE OR REPLACE settle_store_credit_for_cart
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
  v_udhari               record;
  v_wallet               record;
  v_group                record;
  v_fee_paise            bigint;
  v_total                bigint;
  v_merchant_new_balance bigint;
  v_new_customer_balance bigint;

  -- Per-item ledger accumulators
  v_item                  record;
  v_item_total            bigint;
  v_product_cost          bigint;
  v_commission            bigint;
  v_merchant_credit       bigint;
  v_merchant_profit       bigint;
  v_total_platform_cut    bigint := 0;
  v_total_merchant_credit bigint := 0;
  v_total_merchant_profit bigint := 0;
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

  -- 4. Compute convenience fee (3% of principal — customer fee, separate from merchant ledger)
  v_fee_paise := ROUND(v_udhari.amount_paise * 0.03);
  v_total     := v_udhari.amount_paise + v_fee_paise;

  IF v_wallet.balance_paise < v_total THEN
    RAISE EXCEPTION 'insufficient_balance:%', v_wallet.balance_paise;
  END IF;

  -- 5. Debit customer wallet
  UPDATE customer_wallets
  SET balance_paise = balance_paise - v_total
  WHERE id = v_wallet.id
  RETURNING balance_paise INTO v_new_customer_balance;

  -- 6. Per-item ledger: mirror the 30%-on-margin formula from finalize_gateway_orders
  FOR v_item IN
    SELECT oi.id,
           oi.unit_price_paise,
           oi.quantity,
           COALESCE(p.wholesale_price_paise, 0) AS wholesale
    FROM   public.shopping_order_items oi
    JOIN   public.shopping_products    p  ON p.id = oi.product_id
    WHERE  oi.group_id = v_udhari.shopping_order_group_id
  LOOP
    v_product_cost    := v_item.wholesale;
    v_item_total      := v_item.unit_price_paise * v_item.quantity;
    -- Commission = 30% of the profit margin per unit × quantity
    v_commission      := GREATEST(0, (v_item.unit_price_paise - v_product_cost))
                         * v_item.quantity * 30 / 100;
    v_merchant_credit := v_item_total - v_commission;
    v_merchant_profit := v_merchant_credit - (v_product_cost * v_item.quantity);

    UPDATE public.shopping_order_items
    SET cost_price_paise        = v_product_cost,
        profit_paise            = v_merchant_profit,
        commission_amount_paise = v_commission
    WHERE id = v_item.id;

    v_total_platform_cut    := v_total_platform_cut    + v_commission;
    v_total_merchant_credit := v_total_merchant_credit + v_merchant_credit;
    v_total_merchant_profit := v_total_merchant_profit + v_merchant_profit;
  END LOOP;

  -- 7. Update order group with full ledger + flip settlement_status to 'settled'
  --    ledger settled at payment time; update_order_delivery_v3 will skip the wallet
  --    credit because settlement_status != 'pending'
  UPDATE public.shopping_order_groups
  SET delivery_status     = 'pending',
      payment_method      = 'store_credit',
      total_amount_paise  = v_total,
      commission_rate     = 0.30,
      platform_cut_paise  = v_total_platform_cut,
      merchant_profit_paise = v_total_merchant_profit,
      settlement_status   = 'settled'
  WHERE id = v_udhari.shopping_order_group_id;

  -- 8. Mark udhari as completed
  UPDATE udhari_requests
  SET status       = 'completed',
      completed_at = NOW(),
      fee_paise    = v_fee_paise
  WHERE id = p_udhari_request_id;

  -- 9. Credit merchant wallet with net merchant credit (not gross amount)
  SELECT wallet_balance_paise INTO v_merchant_new_balance
  FROM merchants
  WHERE id = v_udhari.merchant_id
  FOR UPDATE;

  v_merchant_new_balance := COALESCE(v_merchant_new_balance, 0) + v_total_merchant_credit;

  UPDATE public.merchants
  SET wallet_balance_paise        = v_merchant_new_balance,
      total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + v_total_platform_cut,
      updated_at                  = NOW()
  WHERE id = v_udhari.merchant_id;

  -- 10. Insert customer wallet transaction (unchanged)
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

  -- 11. Insert merchant transaction ledger with correct amounts and platform cut
  INSERT INTO merchant_transactions (
    merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise,
    description, metadata
  ) VALUES (
    v_udhari.merchant_id,
    'store_credit_payment',
    v_total_merchant_credit,
    v_total_platform_cut,
    v_merchant_new_balance,
    'Store Credit Paid: Shop Order #' || LEFT(v_udhari.shopping_order_group_id::text, 8),
    jsonb_build_object(
      'udhari_request_id',       p_udhari_request_id,
      'customer_id',             p_customer_user_id,
      'shopping_order_group_id', v_udhari.shopping_order_group_id,
      'platform_cut_paise',      v_total_platform_cut,
      'merchant_profit_paise',   v_total_merchant_profit,
      'merchant_credit_paise',   v_total_merchant_credit
    )
  );

  -- 12. Return success
  RETURN jsonb_build_object(
    'success',           true,
    'new_balance_paise', v_new_customer_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.settle_store_credit_for_cart(uuid, uuid) TO service_role;


-- =========================================================
-- SECTION B: ONE-TIME BACKFILL
--
-- BACKFILL: ledger numbers only. Wallets and merchant_transactions
-- are intentionally NOT modified here; affected merchants were already
-- credited by the previous (buggy) settle RPC.
-- =========================================================
DO $backfill$
DECLARE
  v_grp                   record;
  v_item                  record;
  v_product_cost          bigint;
  v_commission            bigint;
  v_merchant_credit       bigint;
  v_merchant_profit       bigint;
  v_total_platform_cut    bigint;
  v_total_merchant_credit bigint;
  v_total_merchant_profit bigint;
BEGIN
  -- Outer loop: store-credit orders whose ledger is still empty
  FOR v_grp IN
    SELECT g.id
    FROM   public.shopping_order_groups g
    WHERE  g.payment_method = 'store_credit'
      AND  (g.merchant_profit_paise IS NULL OR g.merchant_profit_paise = 0)
      AND  EXISTS (
             SELECT 1
             FROM   public.udhari_requests u
             WHERE  u.shopping_order_group_id = g.id
               AND  u.source_type = 'shop_order'
               AND  u.status      = 'completed'
           )
  LOOP
    -- Reset running totals per group
    v_total_platform_cut    := 0;
    v_total_merchant_credit := 0;
    v_total_merchant_profit := 0;

    -- Inner loop: per-item ledger using same formula as Section A
    FOR v_item IN
      SELECT oi.id,
             oi.unit_price_paise,
             oi.quantity,
             COALESCE(p.wholesale_price_paise, 0) AS wholesale
      FROM   public.shopping_order_items oi
      JOIN   public.shopping_products    p  ON p.id = oi.product_id
      WHERE  oi.group_id = v_grp.id
    LOOP
      v_product_cost    := v_item.wholesale;
      v_commission      := GREATEST(0, (v_item.unit_price_paise - v_product_cost))
                           * v_item.quantity * 30 / 100;
      v_merchant_credit := (v_item.unit_price_paise * v_item.quantity) - v_commission;
      v_merchant_profit := v_merchant_credit - (v_product_cost * v_item.quantity);

      UPDATE public.shopping_order_items
      SET cost_price_paise        = v_product_cost,
          profit_paise            = v_merchant_profit,
          commission_amount_paise = v_commission
      WHERE id = v_item.id;

      v_total_platform_cut    := v_total_platform_cut    + v_commission;
      v_total_merchant_credit := v_total_merchant_credit + v_merchant_credit;
      v_total_merchant_profit := v_total_merchant_profit + v_merchant_profit;
    END LOOP;

    -- Update group ledger columns; preserve any already-terminal settlement_status
    -- (admin_takeover, settled_zero) while flipping leftover 'pending' rows to 'settled'
    UPDATE public.shopping_order_groups
    SET commission_rate       = 0.30,
        platform_cut_paise    = v_total_platform_cut,
        merchant_profit_paise = v_total_merchant_profit,
        settlement_status     = COALESCE(NULLIF(settlement_status, 'pending'), 'settled')
    WHERE id = v_grp.id;
  END LOOP;
END;
$backfill$;


-- =========================================================
-- SECTION C: RE-EMIT respond_store_credit_request
--   Body is identical to store_credits_shop_extension.sql lines 287-354.
--   The only addition is the intent comment block inside the approve branch
--   documenting that ledger work is deferred to settle_store_credit_for_cart.
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

    -- NOTE: The merchant ledger fields (commission_rate, platform_cut_paise,
    -- merchant_profit_paise, per-item cost_price_paise / profit_paise /
    -- commission_amount_paise) are intentionally NOT computed here.
    -- They are populated atomically inside settle_store_credit_for_cart at the
    -- moment the customer's wallet is debited, which is also when we flip
    -- settlement_status to 'settled'. Do not duplicate that work in this RPC.
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
