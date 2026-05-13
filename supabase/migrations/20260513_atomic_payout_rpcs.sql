-- =============================================================================
-- Migration: 20260513_atomic_payout_rpcs
-- Purpose  : Introduce three SECURITY DEFINER RPCs that atomically handle all
--            money-moving writes for payout requests, eliminating the non-atomic
--            JS read-modify-write patterns and the pre-debit duplicate-check bug.
--
-- Rollback stubs (uncomment to revert):
-- DROP FUNCTION IF EXISTS merchant_request_payout(uuid, bigint, text, uuid, text);
-- DROP FUNCTION IF EXISTS merchant_cancel_pending_payout(uuid, uuid);
-- DROP FUNCTION IF EXISTS admin_reject_payout(uuid, uuid, text);
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. merchant_request_payout
--    Called by the merchant POST handler. Deduplicates, debits, and inserts
--    the payout request inside a single transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION merchant_request_payout(
    p_user_id         uuid,
    p_amount_paise    bigint,
    p_source          text,
    p_reference_id    uuid,
    p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_merchant          record;
    v_min_paise         bigint;
    v_existing          uuid;
    v_contract          record;
    v_rows              integer;
    v_request_id        uuid;
    v_new_balance       bigint;
    v_bank_account      text;
    v_bank_ifsc         text;
    v_bank_holder       text;
    v_bank_name         text;
BEGIN
    -- 1. Lock merchant row
    SELECT id, wallet_balance_paise, bank_verified, bank_data, status
    INTO   v_merchant
    FROM   merchants
    WHERE  user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_found');
    END IF;

    -- 2. Merchant must be approved
    IF v_merchant.status <> 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_approved');
    END IF;

    -- 3. Bank must be verified
    IF v_merchant.bank_verified IS NOT TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'bank_not_verified');
    END IF;

    -- 4. Minimum payout check
    SELECT COALESCE((value::bigint), 10000)
    INTO   v_min_paise
    FROM   platform_settings
    WHERE  key = 'min_payout_paise'
    LIMIT  1;

    v_min_paise := COALESCE(v_min_paise, 10000);

    IF p_amount_paise < v_min_paise THEN
        RETURN jsonb_build_object('success', false, 'error', 'below_minimum');
    END IF;

    -- 5. Duplicate pending check (BEFORE any debit)
    SELECT id
    INTO   v_existing
    FROM   payout_requests
    WHERE  merchant_id  = v_merchant.id
      AND  payout_source = p_source
      AND  status        = 'pending'
    LIMIT  1;

    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'duplicate_pending');
    END IF;

    -- 6. Source-specific debit / contract lock
    IF p_source = 'wallet' THEN
        UPDATE merchants
        SET    wallet_balance_paise = wallet_balance_paise - p_amount_paise
        WHERE  id                  = v_merchant.id
          AND  wallet_balance_paise >= p_amount_paise;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
        END IF;

        SELECT wallet_balance_paise
        INTO   v_new_balance
        FROM   merchants
        WHERE  id = v_merchant.id;

    ELSIF p_source = 'growth_fund' THEN
        IF p_reference_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'contract_not_found');
        END IF;

        SELECT *
        INTO   v_contract
        FROM   merchant_lockin_balances
        WHERE  id          = p_reference_id
          AND  merchant_id = v_merchant.id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'contract_not_found');
        END IF;

        IF v_contract.status <> 'matured' THEN
            RETURN jsonb_build_object('success', false, 'error', 'contract_not_matured');
        END IF;

        -- Integer equality — no float rounding
        IF (v_contract.amount_paise + COALESCE(v_contract.accumulated_interest_paise, 0)) <> p_amount_paise THEN
            RETURN jsonb_build_object('success', false, 'error', 'incorrect_maturity_amount');
        END IF;

        UPDATE merchant_lockin_balances
        SET    status = 'payout_requested'
        WHERE  id     = p_reference_id;

        v_new_balance := NULL; -- not applicable for growth_fund

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'invalid_source');
    END IF;

    -- 7. Validate bank data snapshot
    v_bank_account := NULLIF(TRIM((v_merchant.bank_data->>'account_number')::text), '');
    v_bank_ifsc    := NULLIF(TRIM(COALESCE(v_merchant.bank_data->>'ifsc', v_merchant.bank_data->>'ifsc_code', '')), '');
    v_bank_holder  := NULLIF(TRIM(COALESCE(
                        v_merchant.bank_data->>'name',
                        v_merchant.bank_data->>'account_holder_name',
                        v_merchant.bank_data->>'beneficiary_name', ''
                      )), '');
    v_bank_name    := NULLIF(TRIM(COALESCE(v_merchant.bank_data->>'bank_name', '')), '');

    IF v_bank_account IS NULL OR v_bank_ifsc IS NULL OR v_bank_holder IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'invalid_bank_data');
    END IF;

    -- 8. Insert payout_request
    INSERT INTO payout_requests (
        merchant_id, user_id, amount, status,
        bank_account_number, bank_ifsc, bank_account_holder, bank_name,
        payout_source, reference_id
    )
    VALUES (
        v_merchant.id, p_user_id, (p_amount_paise::numeric / 100), 'pending',
        v_bank_account, v_bank_ifsc, v_bank_holder, v_bank_name,
        p_source, p_reference_id
    )
    RETURNING id INTO v_request_id;

    -- 9. Wallet transaction audit trail (wallet branch only)
    IF p_source = 'wallet' THEN
        INSERT INTO wallet_transactions (
            user_id, merchant_id, transaction_type, amount,
            description, reference_type, reference_id
        )
        VALUES (
            p_user_id,
            v_merchant.id,
            'DEBIT',
            (p_amount_paise::numeric / 100),
            'Wallet payout request #' || UPPER(LEFT(v_request_id::text, 8)) || ' submitted',
            'payout_request',
            v_request_id
        );
    END IF;

    -- 10. Return success
    RETURN jsonb_build_object(
        'success',             true,
        'request_id',          v_request_id,
        'balance_after_paise', v_new_balance
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION merchant_request_payout(uuid, bigint, text, uuid, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. merchant_cancel_pending_payout
--    Allows a merchant to cancel their own pending payout, atomically
--    reversing the debit or contract status flip.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION merchant_cancel_pending_payout(
    p_user_id    uuid,
    p_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payout record;
BEGIN
    -- 1. Fetch and lock — verify ownership via JOIN
    SELECT pr.*, m.id AS mid
    INTO   v_payout
    FROM   payout_requests pr
    JOIN   merchants m ON m.id = pr.merchant_id
    WHERE  pr.id       = p_request_id
      AND  m.user_id   = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_found');
    END IF;

    -- 2. Only pending requests can be cancelled
    IF v_payout.status <> 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_cancellable');
    END IF;

    -- 3. Reverse the source-specific operation
    IF v_payout.payout_source = 'wallet' THEN
        UPDATE merchants
        SET    wallet_balance_paise = wallet_balance_paise + (v_payout.amount * 100)::bigint
        WHERE  id = v_payout.merchant_id;

    ELSIF v_payout.payout_source = 'growth_fund' THEN
        UPDATE merchant_lockin_balances
        SET    status = 'matured'
        WHERE  id = v_payout.reference_id;
    END IF;

    -- 4. Mark the request as rejected (merchant-initiated)
    UPDATE payout_requests
    SET    status     = 'rejected',
           admin_note = 'Cancelled by merchant'
    WHERE  id = p_request_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION merchant_cancel_pending_payout(uuid, uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. admin_reject_payout
--    Atomically rejects a payout and refunds the merchant (wallet or contract).
--    Only callable with service_role key (via admin client).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_reject_payout(
    p_request_id    uuid,
    p_admin_user_id uuid,
    p_admin_note    text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payout record;
BEGIN
    -- 1. Lock the payout request row
    SELECT *
    INTO   v_payout
    FROM   payout_requests
    WHERE  id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_found');
    END IF;

    -- 2. Only pending or approved can be rejected
    IF v_payout.status NOT IN ('pending', 'approved') THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_rejectable');
    END IF;

    -- 3. Reverse the source-specific operation
    IF v_payout.payout_source = 'wallet' THEN
        UPDATE merchants
        SET    wallet_balance_paise = wallet_balance_paise + (v_payout.amount * 100)::bigint
        WHERE  id = v_payout.merchant_id;

        INSERT INTO wallet_transactions (
            user_id, merchant_id, transaction_type, amount,
            description, reference_type, reference_id
        )
        VALUES (
            v_payout.user_id,
            v_payout.merchant_id,
            'CREDIT',
            v_payout.amount,
            'Payout request #' || UPPER(LEFT(p_request_id::text, 8)) || ' rejected — amount refunded to wallet',
            'payout_request',
            p_request_id
        );

    ELSIF v_payout.payout_source = 'growth_fund' THEN
        UPDATE merchant_lockin_balances
        SET    status = 'matured'
        WHERE  id = v_payout.reference_id;
    END IF;

    -- 4. Update the payout request
    UPDATE payout_requests
    SET    status      = 'rejected',
           admin_note  = p_admin_note,
           reviewed_by = p_admin_user_id,
           reviewed_at = now()
    WHERE  id = p_request_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Only callable via service_role (admin client); revoke from authenticated
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) TO service_role;
