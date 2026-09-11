-- Migration: 20260911_merchant_subscription_wallet_payment.sql
-- Enables merchants to pay for their subscription using their Merchant Wallet balance atomically.
-- Guarantees exact parity with SabPaisa fulfillment:
--   - Same plan pricing resolution from platform_settings
--   - Same first-subscription effects (role upgrade, referral reward, merchant_onboard reward)
--   - Same renewal effects (extension from current active expiry or now, subscription_renewal reward)
--   - Full idempotency check preventing double-debits or duplicate rewards
--   - Strict row locking (FOR UPDATE) to prevent concurrency races
--   - Complete financial ledger updates (wallet_transactions, merchant_transactions, transactions)

DROP FUNCTION IF EXISTS public.pay_merchant_subscription_with_wallet(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.pay_merchant_subscription_with_wallet(
    p_merchant_id      UUID,
    p_plan_code        TEXT,
    p_idempotency_key  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id             UUID;
    v_is_admin              BOOLEAN := false;
    v_merchant_user_id      UUID;
    v_wallet_balance_paise  BIGINT;
    v_subscription_status   TEXT;
    v_subscription_expires  TIMESTAMPTZ;
    v_last_sub_gateway_txn  TEXT;
    
    v_client_txn_id         TEXT;
    v_setting_key           TEXT;
    v_default_price_paise   BIGINT;
    v_duration_days         INTEGER;
    v_plan_label            TEXT;
    
    v_setting_val           TEXT;
    v_price_paise           BIGINT;
    v_new_balance_paise     BIGINT;
    v_is_renewal            BOOLEAN := false;
    v_base_date             TIMESTAMPTZ;
    v_new_expiry            TIMESTAMPTZ;
    v_txn_id                UUID;
    
    v_existing_tx           RECORD;
BEGIN
    -- 1. Identify caller and verify authorization
    v_caller_id := auth.uid();
    
    -- Lock and fetch merchant row immediately
    SELECT 
        user_id, 
        wallet_balance_paise, 
        subscription_status, 
        subscription_expires_at, 
        last_sub_gateway_txn_id
    INTO 
        v_merchant_user_id,
        v_wallet_balance_paise,
        v_subscription_status,
        v_subscription_expires,
        v_last_sub_gateway_txn
    FROM public.merchants
    WHERE id = p_merchant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MERCHANT_NOT_FOUND',
            'message', 'Merchant record not found.'
        );
    END IF;

    -- Authorization check: caller must be owner or admin/service_role
    IF v_caller_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = v_caller_id AND role IN ('admin', 'super_admin')
        ) INTO v_is_admin;

        IF v_caller_id <> v_merchant_user_id AND NOT v_is_admin THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'UNAUTHORIZED',
                'message', 'You are not authorized to purchase subscription for this merchant.'
            );
        END IF;
    END IF;

    -- 2. Validate plan code and resolve duration/pricing keys
    CASE p_plan_code
        WHEN 'MSUB_1M' THEN
            v_setting_key := 'merchant_sub_price_1m';
            v_default_price_paise := 49900;
            v_duration_days := 30;
            v_plan_label := '1 Month';
        WHEN 'MSUB_6M' THEN
            v_setting_key := 'merchant_sub_price_6m';
            v_default_price_paise := 199900;
            v_duration_days := 180;
            v_plan_label := '6 Months';
        WHEN 'MSUB_12M' THEN
            v_setting_key := 'merchant_sub_price_12m';
            v_default_price_paise := 399900;
            v_duration_days := 365;
            v_plan_label := '12 Months';
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'error', 'INVALID_PLAN',
                'message', 'Invalid subscription plan code: ' || COALESCE(p_plan_code, 'NULL')
            );
    END CASE;

    -- 3. Prepare idempotency key / client transaction ID
    v_client_txn_id := NULLIF(TRIM(p_idempotency_key), '');
    IF v_client_txn_id IS NULL THEN
        v_client_txn_id := 'WALLET-MSUB-' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8);
    END IF;

    -- Idempotency check: if this reference was already processed, return original success
    SELECT id, client_txn_id, expected_amount_paise, created_at
    INTO v_existing_tx
    FROM public.transactions
    WHERE client_txn_id = v_client_txn_id
      AND udf1 = 'MERCHANT_SUBSCRIPTION'
      AND status = 'completed'
    LIMIT 1;

    IF v_existing_tx.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'replayed', true,
            'paymentMethod', 'WALLET',
            'planCode', p_plan_code,
            'amountPaidPaise', v_existing_tx.expected_amount_paise,
            'subscriptionExpiresAt', v_subscription_expires,
            'walletBalancePaise', v_wallet_balance_paise,
            'transactionReference', v_client_txn_id,
            'message', 'Subscription already activated with this transaction reference.'
        );
    END IF;

    -- Also check wallet_transactions for duplicate idempotency key
    IF EXISTS (
        SELECT 1 FROM public.wallet_transactions
        WHERE reference_id = v_client_txn_id
          AND reference_type = 'MERCHANT_SUBSCRIPTION'
          AND status = 'COMPLETED'
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'replayed', true,
            'paymentMethod', 'WALLET',
            'planCode', p_plan_code,
            'amountPaidPaise', v_default_price_paise,
            'subscriptionExpiresAt', v_subscription_expires,
            'walletBalancePaise', v_wallet_balance_paise,
            'transactionReference', v_client_txn_id,
            'message', 'Subscription already processed.'
        );
    END IF;

    -- 4. Authoritative Price Resolution from platform_settings
    SELECT value INTO v_setting_val
    FROM public.platform_settings
    WHERE key = v_setting_key;

    IF v_setting_val IS NOT NULL AND v_setting_val ~ '^[0-9]+(\.[0-9]+)?$' THEN
        v_price_paise := ROUND(v_setting_val::numeric * 100);
    ELSE
        v_price_paise := v_default_price_paise;
    END IF;

    -- 5. Validate sufficient wallet balance
    IF v_wallet_balance_paise < v_price_paise THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_WALLET_BALANCE',
            'requiredPaise', v_price_paise,
            'availablePaise', v_wallet_balance_paise,
            'shortfallPaise', (v_price_paise - v_wallet_balance_paise),
            'message', format(
                'Insufficient wallet balance. Required: ₹%s, Available: ₹%s',
                (v_price_paise / 100.0)::numeric(10,2),
                (v_wallet_balance_paise / 100.0)::numeric(10,2)
            )
        );
    END IF;

    -- 6. Compute new balance and subscription duration / expiry
    v_new_balance_paise := v_wallet_balance_paise - v_price_paise;

    -- Renewal check matches fulfillment.js: active status OR valid expiry date
    v_is_renewal := (v_subscription_status = 'active') OR (v_subscription_expires IS NOT NULL);

    IF v_subscription_expires IS NOT NULL AND v_subscription_expires > NOW() THEN
        v_base_date := v_subscription_expires;
    ELSE
        v_base_date := NOW();
    END IF;

    v_new_expiry := v_base_date + (v_duration_days || ' days')::interval;

    -- 7. Perform atomic mutations
    -- Bypass sensitive column trigger guard
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- Update merchant record
    UPDATE public.merchants
    SET 
        wallet_balance_paise = v_new_balance_paise,
        subscription_status = 'active',
        subscription_expires_at = v_new_expiry,
        last_sub_gateway_txn_id = v_client_txn_id,
        updated_at = NOW()
    WHERE id = p_merchant_id;

    -- 8. Record in wallet_transactions
    INSERT INTO public.wallet_transactions (
        user_id,
        merchant_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        reference_type,
        description,
        status,
        completed_at,
        created_at
    ) VALUES (
        v_merchant_user_id,
        p_merchant_id,
        'DEBIT',
        (v_price_paise / 100.0)::numeric,
        (v_wallet_balance_paise / 100.0)::numeric,
        (v_new_balance_paise / 100.0)::numeric,
        v_client_txn_id,
        'MERCHANT_SUBSCRIPTION',
        'Merchant subscription — ' || v_plan_label,
        'COMPLETED',
        NOW(),
        NOW()
    );

    -- 9. Record in merchant_transactions (merchant paise ledger)
    INSERT INTO public.merchant_transactions (
        merchant_id,
        transaction_type,
        amount_paise,
        balance_after_paise,
        description,
        metadata,
        created_at
    ) VALUES (
        p_merchant_id,
        'subscription',
        -v_price_paise,
        v_new_balance_paise,
        'Merchant subscription — ' || v_plan_label,
        jsonb_build_object(
            'plan_code', p_plan_code,
            'client_txn_id', v_client_txn_id,
            'duration_days', v_duration_days,
            'payment_method', 'WALLET'
        ),
        NOW()
    );

    -- 10. Record in transactions (central payment audit record)
    v_txn_id := gen_random_uuid();
    INSERT INTO public.transactions (
        id,
        client_txn_id,
        user_id,
        amount,
        paid_amount,
        expected_amount_paise,
        paid_amount_paise,
        currency,
        payment_method,
        payment_mode,
        status,
        udf1,
        udf2,
        udf3,
        fulfilled_at,
        completed_at,
        created_at,
        updated_at
    ) VALUES (
        v_txn_id,
        v_client_txn_id,
        v_merchant_user_id,
        (v_price_paise / 100.0)::numeric,
        (v_price_paise / 100.0)::numeric,
        v_price_paise,
        v_price_paise,
        'INR',
        'WALLET',
        'WALLET',
        'completed',
        'MERCHANT_SUBSCRIPTION',
        p_merchant_id::text,
        p_plan_code,
        NOW(),
        NOW(),
        NOW(),
        NOW()
    );

    -- 11. Role Update & Rewards (Parity with SabPaisa fulfillment)
    IF NOT v_is_renewal THEN
        -- Activate merchant role on profile if user is not an admin
        UPDATE public.user_profiles
        SET role = 'merchant', updated_at = NOW()
        WHERE id = v_merchant_user_id
          AND role NOT IN ('admin', 'super_admin');

        -- Level 1 referral reward
        BEGIN
            PERFORM public.distribute_merchant_referral_reward(p_merchant_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'distribute_merchant_referral_reward non-fatal error: %', SQLERRM;
        END;

        -- Merchant onboard reward
        BEGIN
            PERFORM public.calculate_and_distribute_rewards(
                'merchant_onboard',
                v_merchant_user_id,
                p_merchant_id,
                'merchant',
                0
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'merchant_onboard reward distribution non-fatal error: %', SQLERRM;
        END;
    ELSE
        -- Renewal reward
        BEGIN
            PERFORM public.calculate_and_distribute_rewards(
                'subscription_renewal',
                v_merchant_user_id,
                v_txn_id,
                'merchant_subscription',
                v_price_paise
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'subscription_renewal reward distribution non-fatal error: %', SQLERRM;
        END;
    END IF;

    -- 12. Create in-app notification
    INSERT INTO public.notifications (
        user_id,
        title,
        body,
        type,
        reference_type,
        reference_id,
        action_url,
        priority
    ) VALUES (
        v_merchant_user_id,
        CASE WHEN v_is_renewal THEN 'Subscription Renewed 🚀' ELSE 'Store Activated 🎉' END,
        'Your ' || v_plan_label || ' merchant subscription has been paid using your wallet. Expiry: ' || to_char(v_new_expiry, 'DD Mon YYYY'),
        'success',
        'merchant_subscription',
        v_txn_id,
        '/merchant/settings?tab=subscription',
        'HIGH'
    );

    -- 13. Return structured success response
    RETURN jsonb_build_object(
        'success', true,
        'replayed', false,
        'paymentMethod', 'WALLET',
        'planCode', p_plan_code,
        'amountPaidPaise', v_price_paise,
        'subscriptionExpiresAt', v_new_expiry,
        'walletBalancePaise', v_new_balance_paise,
        'transactionReference', v_client_txn_id,
        'isRenewal', v_is_renewal,
        'message', CASE WHEN v_is_renewal THEN 'Subscription renewed successfully.' ELSE 'Subscription activated successfully.' END
    );
END;
$$;

-- Permissions and grants
REVOKE EXECUTE ON FUNCTION public.pay_merchant_subscription_with_wallet(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pay_merchant_subscription_with_wallet(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.pay_merchant_subscription_with_wallet(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_merchant_subscription_with_wallet(UUID, TEXT, TEXT) TO service_role;
