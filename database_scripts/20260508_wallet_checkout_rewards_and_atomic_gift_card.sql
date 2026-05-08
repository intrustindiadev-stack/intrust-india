-- ============================================================
-- Migration: 20260508_wallet_checkout_rewards_and_atomic_gift_card
-- Description:
--   1. Add wallet_buy_gift_card RPC — replaces the multi-step orchestration
--      in app/api/gift-cards/buy-wallet/route.js with a single atomic
--      transaction that locks customer_wallets and coupons rows, performs
--      the debit, marks the coupon sold, creates the order, and writes the
--      ledger entry.  Application-level compensating rollbacks are eliminated.
--
--   2. (Documentation comment) customer_checkout_v4 already uses an implicit
--      PG transaction; purchase reward distribution is handled by the new
--      server-side /api/shopping/wallet-checkout route.  This migration
--      records that intent explicitly so future maintainers understand why
--      customer_checkout_v4 does NOT contain an inline reward RPC call
--      (rewards run after the transaction commits, with the service role).
-- ============================================================


-- ── 1. wallet_buy_gift_card RPC ──────────────────────────────────────────────
--
-- Atomically:
--   a. SELECT … FOR UPDATE on customer_wallets WHERE user_id = p_user_id
--   b. SELECT … FOR UPDATE on coupons WHERE id = p_coupon_id
--   c. Verify coupon is 'available' and balance is sufficient
--   d. UPDATE customer_wallets (balance - purchase_amount)
--   e. INSERT customer_wallet_transactions (DEBIT row)
--   f. UPDATE coupons SET status = 'sold', purchased_by, purchased_at
--   g. INSERT orders → return order id
--   h. RETURN jsonb with success, order_id, merchant_id, coupon_title,
--      new_balance_paise, purchase_amount_paise
--
-- Concurrent top-ups during a failed purchase are preserved because the
-- wallet update uses an absolute balance (balance - amount) derived from the
-- FOR UPDATE snapshot rather than a snapshot captured before the lock.
-- If ANY step fails the entire transaction rolls back — no stale snapshots,
-- no compensating refund needed.

CREATE OR REPLACE FUNCTION public.wallet_buy_gift_card(
    p_user_id  uuid,
    p_coupon_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet            RECORD;
    v_coupon            RECORD;
    v_purchase_paise    BIGINT;
    v_new_balance       BIGINT;
    v_order_id          UUID;
BEGIN
    -- ── a. Lock wallet row (prevents concurrent debit races) ──────────────
    SELECT id, balance_paise
    INTO   v_wallet
    FROM   public.customer_wallets
    WHERE  user_id = p_user_id
    FOR    UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    -- ── b. Lock coupon row (prevents double-sell) ─────────────────────────
    SELECT id, status, selling_price_paise, face_value_paise,
           merchant_id, title
    INTO   v_coupon
    FROM   public.coupons
    WHERE  id = p_coupon_id
    FOR    UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gift card not found');
    END IF;

    -- ── c. Guards ─────────────────────────────────────────────────────────
    IF v_coupon.status <> 'available' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gift card is not available');
    END IF;

    v_purchase_paise := COALESCE(
        NULLIF(v_coupon.selling_price_paise, 0),
        v_coupon.face_value_paise,
        0
    );

    IF v_wallet.balance_paise < v_purchase_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    v_new_balance := v_wallet.balance_paise - v_purchase_paise;

    -- ── d. Debit wallet ───────────────────────────────────────────────────
    UPDATE public.customer_wallets
    SET    balance_paise = v_new_balance,
           updated_at    = now()
    WHERE  id = v_wallet.id;

    -- ── e. Write ledger entry ─────────────────────────────────────────────
    INSERT INTO public.customer_wallet_transactions (
        wallet_id, user_id, type, amount_paise,
        balance_before_paise, balance_after_paise,
        description, reference_id, reference_type
    ) VALUES (
        v_wallet.id, p_user_id, 'DEBIT', v_purchase_paise,
        v_wallet.balance_paise, v_new_balance,
        'Purchased Gift Card: ' || COALESCE(v_coupon.title, 'Gift Card'),
        p_coupon_id::text, 'GIFT_CARD_PURCHASE'
    );

    -- ── f. Mark coupon sold ───────────────────────────────────────────────
    UPDATE public.coupons
    SET    status       = 'sold',
           purchased_by = p_user_id,
           purchased_at = now()
    WHERE  id = p_coupon_id;

    -- ── g. Create order record ────────────────────────────────────────────
    INSERT INTO public.orders (
        user_id, merchant_id, giftcard_id,
        amount, payment_status, created_at
    ) VALUES (
        p_user_id, v_coupon.merchant_id, p_coupon_id,
        v_purchase_paise, 'paid', now()
    )
    RETURNING id INTO v_order_id;

    -- ── h. Return enriched payload to application layer ───────────────────
    RETURN jsonb_build_object(
        'success',               true,
        'order_id',              v_order_id,
        'merchant_id',           v_coupon.merchant_id,
        'coupon_title',          COALESCE(v_coupon.title, 'Gift Card'),
        'new_balance_paise',     v_new_balance,
        'purchase_amount_paise', v_purchase_paise
    );

EXCEPTION WHEN OTHERS THEN
    -- Surface the error message so the API layer can log and translate it.
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Only the service role (used by app/api/gift-cards/buy-wallet/route.js) may
-- call this function.  Authenticated sessions must go through the API route.
REVOKE EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.wallet_buy_gift_card(uuid, uuid) FROM anon;
-- The service_role bypasses REVOKE, so no explicit GRANT is needed.


-- ── 2. Documentation guard: customer_checkout_v4 reward intent ──────────────
--
-- customer_checkout_v4 does not call calculate_and_distribute_rewards inline
-- because rewards must run AFTER the checkout transaction commits (to avoid
-- rewarding a rolled-back purchase).  The application layer handles this via:
--
--   app/api/shopping/wallet-checkout/route.js
--     → calls customer_checkout_v4  (atomic; commits)
--     → then calls calculate_and_distribute_rewards with the returned group_id
--
-- This comment is preserved here so future migrations that touch
-- customer_checkout_v4 know NOT to inline the reward call.

-- ── 3. Regression verification queries (run manually after migration) ────────
-- Verify wallet_buy_gift_card exists and is owned by service role:
--   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'wallet_buy_gift_card';
--
-- Verify purchase rewards are credited exactly once for a wallet gift-card buy
-- (use test IDs in a staging environment):
--   SELECT COUNT(*) FROM reward_transactions
--   WHERE reference_type = 'gift_card_purchase' AND reference_id = '<coupon-id>';
--   -- Expected: 1 row (issued by the API route post-commit)
