-- ============================================================================
-- Wallet Adjustment RPC
-- Atomic wallet adjustment with idempotency and audit trails
-- DEPENDENCY: Must run after wallet_adjustment_audit_setup.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION perform_wallet_adjustment(
    p_target_user_id UUID,
    p_wallet_type TEXT,
    p_operation TEXT,
    p_amount_paise BIGINT,
    p_admin_user_id UUID,
    p_reason TEXT,
    p_idempotency_key UUID,
    p_ip_address TEXT DEFAULT '0.0.0.0',
    p_user_agent TEXT DEFAULT ''
) RETURNS json AS $$
DECLARE
    v_balance_before_paise BIGINT := 0;
    v_balance_after_paise BIGINT := 0;
    v_transaction_id UUID;
    v_audit_log_id UUID;
    v_merchant_id UUID;
    v_customer_wallet_id UUID;
    v_existing_status TEXT;
    v_existing_log_id UUID;
    v_existing_balance_after BIGINT;
BEGIN
    -- 1. Idempotency Check
    SELECT id, status::text, balance_after_paise INTO v_existing_log_id, v_existing_status, v_existing_balance_after
    FROM wallet_adjustment_logs
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_log_id IS NOT NULL THEN
        IF v_existing_status = 'completed' THEN
            RETURN json_build_object(
                'duplicate', true,
                'audit_log_id', v_existing_log_id,
                'balance_after_paise', v_existing_balance_after
            );
        ELSE
            RAISE EXCEPTION 'Idempotency key % exists but is not completed. Status: %', p_idempotency_key, v_existing_status;
        END IF;
    END IF;

    -- 2. Validate input and get current balance (with lock)
    IF p_wallet_type = 'merchant' THEN
        SELECT id, COALESCE(wallet_balance_paise, 0)
        INTO v_merchant_id, v_balance_before_paise
        FROM merchants
        WHERE user_id = p_target_user_id
        FOR UPDATE;

        IF v_merchant_id IS NULL THEN
            RAISE EXCEPTION 'Merchant wallet not found for user %', p_target_user_id;
        END IF;
    ELSIF p_wallet_type = 'customer' THEN
        SELECT id, COALESCE(balance_paise, 0)
        INTO v_customer_wallet_id, v_balance_before_paise
        FROM customer_wallets
        WHERE user_id = p_target_user_id
        FOR UPDATE;

        IF NOT FOUND THEN
            -- Create customer wallet if it doesn't exist
            INSERT INTO customer_wallets (user_id, balance_paise)
            VALUES (p_target_user_id, 0)
            RETURNING id, balance_paise INTO v_customer_wallet_id, v_balance_before_paise;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid wallet type %', p_wallet_type;
    END IF;

    -- 3. Calculate new balance
    IF p_operation = 'credit' THEN
        v_balance_after_paise := v_balance_before_paise + p_amount_paise;
    ELSIF p_operation = 'debit' THEN
        IF v_balance_before_paise < p_amount_paise THEN
            RAISE EXCEPTION 'Insufficient balance. Current: %, Requested: %', v_balance_before_paise, p_amount_paise;
        END IF;
        v_balance_after_paise := v_balance_before_paise - p_amount_paise;
    ELSE
        RAISE EXCEPTION 'Invalid operation %', p_operation;
    END IF;

    -- 4. Update the wallet balance
    IF p_wallet_type = 'merchant' THEN
        UPDATE merchants
        SET wallet_balance_paise = v_balance_after_paise,
            updated_at = now()
        WHERE id = v_merchant_id;
    ELSE
        UPDATE customer_wallets
        SET balance_paise = v_balance_after_paise,
            updated_at = now()
        WHERE id = v_customer_wallet_id;
    END IF;

    -- 5. Create audit log entry FIRST so we can use its ID as a reference
    INSERT INTO wallet_adjustment_logs (
        admin_user_id,
        target_user_id,
        wallet_type,
        operation,
        amount_paise,
        balance_before_paise,
        balance_after_paise,
        reason,
        idempotency_key,
        status,
        ip_address,
        user_agent,
        completed_at
    ) VALUES (
        p_admin_user_id,
        p_target_user_id,
        cast(p_wallet_type as wallet_type_enum),
        cast(p_operation as wallet_operation_enum),
        p_amount_paise,
        v_balance_before_paise,
        v_balance_after_paise,
        p_reason,
        p_idempotency_key,
        'completed'::adjustment_status_enum,
        p_ip_address::inet,
        p_user_agent,
        now()
    ) RETURNING id INTO v_audit_log_id;

    -- 6. Insert transaction into the respective ledger history table
    IF p_wallet_type = 'merchant' THEN
        INSERT INTO wallet_transactions (
            user_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            reference_id,
            reference_type,
            description,
            status
        ) VALUES (
            p_target_user_id,
            UPPER(p_operation::text),
            (p_amount_paise::numeric / 100),
            (v_balance_before_paise::numeric / 100),
            (v_balance_after_paise::numeric / 100),
            v_audit_log_id::text,
            'ADMIN_ADJUSTMENT',
            'Admin adjustment: ' || p_reason,
            'COMPLETED'
        ) RETURNING id INTO v_transaction_id;
    ELSE
        INSERT INTO customer_wallet_transactions (
            wallet_id,
            user_id,
            type,
            amount_paise,
            balance_before_paise,
            balance_after_paise,
            reference_id,
            reference_type,
            description
        ) VALUES (
            v_customer_wallet_id,
            p_target_user_id,
            UPPER(p_operation::text),
            p_amount_paise,
            v_balance_before_paise,
            v_balance_after_paise,
            v_audit_log_id::text,
            'ADMIN_ADJUSTMENT',
            'Admin adjustment: ' || p_reason
        ) RETURNING id INTO v_transaction_id;
    END IF;

    -- Return full result object
    RETURN json_build_object(
        'duplicate', false,
        'audit_log_id', v_audit_log_id,
        'transaction_id', v_transaction_id,
        'balance_after_paise', v_balance_after_paise
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
