-- Migration: 20260515_wallet_activate_gold_subscription.sql
-- Creates a SECURITY DEFINER RPC that atomically handles Gold subscription
-- activation via wallet payment. Prevents partial updates and TOCTOU races.
--
-- Parameters:
--   p_user_id           uuid    — Supabase auth.uid()
--   p_package_key       text    — Plan key e.g. 'GOLD_1M', 'GOLD_3M', 'GOLD_1Y'
--   p_idempotency_key   text    — Client-generated idempotency key (optional, pass NULL if not provided)
--
-- Returns:
--   JSON with keys: success, new_expiry, message

-- Drop if exists (safe to replay)
DROP FUNCTION IF EXISTS wallet_activate_gold_subscription(uuid, text, text);

CREATE OR REPLACE FUNCTION wallet_activate_gold_subscription(
    p_user_id         uuid,
    p_package_key     text,
    p_idempotency_key text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_price_paise          bigint;
    v_duration_months      int;
    v_cashback_paise       bigint;
    v_label                text;

    v_current_balance_paise bigint;
    v_current_expiry        timestamptz;
    v_is_gold_verified      boolean;
    v_base_date             timestamptz;
    v_new_expiry            timestamptz;

    v_debit_txn_id         uuid;
BEGIN
    -- 1. Resolve canonical plan constants server-side (no trust of client amounts)
    CASE p_package_key
        WHEN 'GOLD_1M' THEN
            v_price_paise    := 99900;   -- ₹999
            v_duration_months := 1;
            v_cashback_paise := 19900;   -- ₹199
            v_label          := '1 Month';
        WHEN 'GOLD_3M' THEN
            v_price_paise    := 249900;  -- ₹2,499
            v_duration_months := 3;
            v_cashback_paise := 49900;   -- ₹499
            v_label          := '3 Months';
        WHEN 'GOLD_1Y' THEN
            v_price_paise    := 799900;  -- ₹7,999
            v_duration_months := 12;
            v_cashback_paise := 149900;  -- ₹1,499
            v_label          := '12 Months';
        ELSE
            RETURN json_build_object(
                'success', false,
                'message', 'Invalid package selection'
            );
    END CASE;

    -- 2. Idempotency guard — bail early if already processed
    IF p_idempotency_key IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM customer_wallet_transactions
            WHERE user_id      = p_user_id
              AND reference_id   = p_idempotency_key
              AND reference_type = 'GOLD_SUBSCRIPTION'
              AND transaction_type = 'DEBIT'
        ) THEN
            RETURN json_build_object(
                'success', true,
                'replayed', true,
                'message', 'Idempotent replay — subscription already activated'
            );
        END IF;
    END IF;

    -- 3. Lock customer wallet row to prevent concurrent debits
    SELECT balance_paise INTO v_current_balance_paise
    FROM customer_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_current_balance_paise IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Wallet not found');
    END IF;

    IF v_current_balance_paise < v_price_paise THEN
        RETURN json_build_object(
            'success', false,
            'message', format(
                'Insufficient balance. Required: ₹%s, Available: ₹%s',
                (v_price_paise / 100.0)::numeric(10,2),
                (v_current_balance_paise / 100.0)::numeric(10,2)
            )
        );
    END IF;

    -- 4. Debit wallet
    UPDATE customer_wallets
    SET balance_paise = balance_paise - v_price_paise,
        updated_at    = now()
    WHERE user_id = p_user_id;

    -- 5. Record debit transaction (also serves as idempotency anchor)
    INSERT INTO customer_wallet_transactions (
        user_id,
        amount_paise,
        transaction_type,
        description,
        reference_id,
        reference_type,
        balance_after_paise,
        created_at
    )
    VALUES (
        p_user_id,
        v_price_paise,
        'DEBIT',
        'Elite Gold ' || v_label || ' Subscription (Wallet Pay)',
        COALESCE(p_idempotency_key, p_package_key),
        'GOLD_SUBSCRIPTION',
        v_current_balance_paise - v_price_paise,
        now()
    )
    RETURNING id INTO v_debit_txn_id;

    -- 6. Determine new expiry (extend from current if still active)
    SELECT is_gold_verified, subscription_expiry
    INTO v_is_gold_verified, v_current_expiry
    FROM user_profiles
    WHERE id = p_user_id;

    v_base_date := now();
    IF v_is_gold_verified AND v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN
        v_base_date := v_current_expiry;
    END IF;

    v_new_expiry := v_base_date + (v_duration_months || ' months')::interval;

    -- 7. Activate / extend subscription on profile
    UPDATE user_profiles
    SET is_gold_verified   = true,
        subscription_expiry = v_new_expiry,
        updated_at          = now()
    WHERE id = p_user_id;

    -- 8. Credit cashback wallet
    UPDATE customer_wallets
    SET balance_paise = balance_paise + v_cashback_paise,
        updated_at    = now()
    WHERE user_id = p_user_id;

    INSERT INTO customer_wallet_transactions (
        user_id,
        amount_paise,
        transaction_type,
        description,
        reference_id,
        reference_type,
        balance_after_paise,
        created_at
    )
    SELECT
        p_user_id,
        v_cashback_paise,
        'CREDIT',
        'Gold ' || v_label || ' Subscription Cashback Reward',
        v_debit_txn_id::text,
        'CASHBACK',
        cw.balance_paise,
        now()
    FROM customer_wallets cw
    WHERE cw.user_id = p_user_id;

    -- 9. In-app notification
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (
        p_user_id,
        'Elite Gold Activated! 🎉',
        'Your Elite Gold subscription has been activated using your wallet. Expiry: '
            || to_char(v_new_expiry, 'DD Mon YYYY'),
        'success',
        'gold_subscription',
        p_package_key
    );

    RETURN json_build_object(
        'success',     true,
        'new_expiry',  v_new_expiry,
        'message',     'Gold subscription activated successfully'
    );

EXCEPTION WHEN OTHERS THEN
    -- Any unhandled error rolls back the entire transaction
    RETURN json_build_object(
        'success', false,
        'message', 'Unexpected error: ' || SQLERRM
    );
END;
$$;

-- Revoke public access — callable only by the service role (via admin client)
REVOKE EXECUTE ON FUNCTION wallet_activate_gold_subscription(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION wallet_activate_gold_subscription(uuid, text, text) TO service_role;

COMMENT ON FUNCTION wallet_activate_gold_subscription IS
    'Atomically debits wallet, activates/extends Gold subscription, credits cashback, '
    'and records an in-app notification. Idempotent when p_idempotency_key is provided. '
    'SECURITY DEFINER — callable only by service_role.';
