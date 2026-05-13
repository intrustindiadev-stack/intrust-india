-- =============================================================================
-- Migration: 20260514_update_payout_rpcs
-- Purpose  : Harden all four payout RPCs:
--              • merchant_request_payout   — idempotency, velocity limits,
--                                           forensics, audit event
--              • merchant_cancel_pending_payout — use amount_paise, audit event
--              • admin_reject_payout           — use amount_paise, audit event
--              • admin_approve_payout          — use amount_paise, audit event
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. merchant_request_payout (extended)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION merchant_request_payout(
    p_user_id              uuid,
    p_amount_paise         bigint,
    p_source               text,
    p_reference_id         uuid,
    p_idempotency_key      text,
    p_requested_ip         text DEFAULT NULL,
    p_requested_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_merchant          record;
    v_settings          record;
    v_min_paise         bigint;
    v_max_paise         bigint;
    v_max_day_paise     bigint;
    v_max_month_paise   bigint;
    v_max_pending_count bigint;
    v_existing          uuid;
    v_contract          record;
    v_rows              integer;
    v_request_id        uuid;
    v_new_balance       bigint;
    v_bank_account      text;
    v_bank_ifsc         text;
    v_bank_holder       text;
    v_bank_name         text;
    v_day_total         bigint;
    v_month_total       bigint;
    v_pending_count     bigint;
BEGIN
    -- 0. Read all velocity-limit settings in one pass
    SELECT
        COALESCE(MAX(CASE WHEN key = 'payout_min_amount_paise'   THEN value::bigint END), 10000) AS min_paise,
        MAX(CASE WHEN key = 'payout_max_amount_paise'   THEN value::bigint END)                  AS max_paise,
        MAX(CASE WHEN key = 'payout_max_per_day_paise'  THEN value::bigint END)                  AS max_day_paise,
        MAX(CASE WHEN key = 'payout_max_per_month_paise'THEN value::bigint END)                  AS max_month_paise,
        COALESCE(MAX(CASE WHEN key = 'payout_max_pending_count'  THEN value::bigint END), 1)     AS max_pending_count
    INTO v_settings
    FROM platform_settings
    WHERE key IN (
        'payout_min_amount_paise', 'payout_max_amount_paise',
        'payout_max_per_day_paise', 'payout_max_per_month_paise',
        'payout_max_pending_count'
    );

    v_min_paise         := v_settings.min_paise;
    v_max_paise         := v_settings.max_paise;       -- NULL means unlimited
    v_max_day_paise     := v_settings.max_day_paise;   -- NULL means unlimited
    v_max_month_paise   := v_settings.max_month_paise; -- NULL means unlimited
    v_max_pending_count := v_settings.max_pending_count;

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

    -- 4. Idempotency check (BEFORE any debit)
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id
        INTO   v_existing
        FROM   payout_requests
        WHERE  merchant_id      = v_merchant.id
          AND  idempotency_key  = p_idempotency_key
        LIMIT  1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success',    true,
                'request_id', v_existing,
                'replayed',   true
            );
        END IF;
    END IF;

    -- 5. Velocity: minimum amount
    IF p_amount_paise < v_min_paise THEN
        RETURN jsonb_build_object('success', false, 'error', 'amount_below_min');
    END IF;

    -- 6. Velocity: maximum amount (when configured)
    IF v_max_paise IS NOT NULL AND p_amount_paise > v_max_paise THEN
        RETURN jsonb_build_object('success', false, 'error', 'amount_above_max');
    END IF;

    -- 7. Velocity: daily cap (when configured)
    IF v_max_day_paise IS NOT NULL THEN
        SELECT COALESCE(SUM(amount_paise), 0)
        INTO   v_day_total
        FROM   payout_requests
        WHERE  merchant_id   = v_merchant.id
          AND  status        NOT IN ('rejected')
          AND  requested_at >= date_trunc('day', now() AT TIME ZONE 'UTC');

        IF v_day_total + p_amount_paise > v_max_day_paise THEN
            RETURN jsonb_build_object('success', false, 'error', 'daily_cap_exceeded');
        END IF;
    END IF;

    -- 8. Velocity: monthly cap (when configured)
    IF v_max_month_paise IS NOT NULL THEN
        SELECT COALESCE(SUM(amount_paise), 0)
        INTO   v_month_total
        FROM   payout_requests
        WHERE  merchant_id   = v_merchant.id
          AND  status        NOT IN ('rejected')
          AND  requested_at >= date_trunc('month', now() AT TIME ZONE 'UTC');

        IF v_month_total + p_amount_paise > v_max_month_paise THEN
            RETURN jsonb_build_object('success', false, 'error', 'monthly_cap_exceeded');
        END IF;
    END IF;

    -- 9. Velocity: max simultaneous pending requests (per source)
    SELECT COUNT(*)
    INTO   v_pending_count
    FROM   payout_requests
    WHERE  merchant_id  = v_merchant.id
      AND  payout_source = p_source
      AND  status        = 'pending';

    IF v_pending_count >= v_max_pending_count THEN
        RETURN jsonb_build_object('success', false, 'error', 'duplicate_pending');
    END IF;

    -- 10. Source-specific debit / contract lock
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

        IF (v_contract.amount_paise + COALESCE(v_contract.accumulated_interest_paise, 0)) <> p_amount_paise THEN
            RETURN jsonb_build_object('success', false, 'error', 'incorrect_maturity_amount');
        END IF;

        UPDATE merchant_lockin_balances
        SET    status = 'payout_requested'
        WHERE  id     = p_reference_id;

        v_new_balance := NULL;

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'invalid_source');
    END IF;

    -- 11. Validate bank data snapshot
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

    -- 12. Insert payout_request (now with idempotency key, amount_paise, forensics)
    INSERT INTO payout_requests (
        merchant_id, user_id, amount, amount_paise, status,
        bank_account_number, bank_ifsc, bank_account_holder, bank_name,
        payout_source, reference_id,
        idempotency_key, requested_ip, requested_user_agent
    )
    VALUES (
        v_merchant.id, p_user_id, (p_amount_paise::numeric / 100), p_amount_paise, 'pending',
        v_bank_account, v_bank_ifsc, v_bank_holder, v_bank_name,
        p_source, p_reference_id,
        p_idempotency_key, p_requested_ip, p_requested_user_agent
    )
    RETURNING id INTO v_request_id;

    -- 13. Wallet transaction audit trail (wallet branch only)
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

    -- 14. Audit event
    INSERT INTO payout_request_events (
        payout_id, actor_id, action, from_status, to_status, payload
    )
    VALUES (
        v_request_id, p_user_id, 'requested', NULL, 'pending',
        jsonb_build_object('amount_paise', p_amount_paise, 'source', p_source)
    );

    -- 15. Return success
    RETURN jsonb_build_object(
        'success',             true,
        'request_id',          v_request_id,
        'balance_after_paise', v_new_balance,
        'replayed',            false
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION merchant_request_payout(uuid, bigint, text, uuid, text, text, text) TO authenticated;


-- ---------------------------------------------------------------------------
-- 2. merchant_cancel_pending_payout (use amount_paise + audit event)
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

    -- 3. Reverse the source-specific operation (use amount_paise column)
    IF v_payout.payout_source = 'wallet' THEN
        UPDATE merchants
        SET    wallet_balance_paise = wallet_balance_paise + v_payout.amount_paise
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

    -- 5. Audit event
    INSERT INTO payout_request_events (
        payout_id, actor_id, action, from_status, to_status, payload
    )
    VALUES (
        p_request_id, p_user_id, 'cancelled', 'pending', 'rejected',
        jsonb_build_object('reason', 'Cancelled by merchant')
    );

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION merchant_cancel_pending_payout(uuid, uuid) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. admin_reject_payout (use amount_paise + audit event)
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
    v_from_status text;
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

    v_from_status := v_payout.status;

    -- 2. Only pending or approved can be rejected
    IF v_payout.status NOT IN ('pending', 'approved') THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_rejectable');
    END IF;

    -- 3. Reverse the source-specific operation (use amount_paise column)
    IF v_payout.payout_source = 'wallet' THEN
        UPDATE merchants
        SET    wallet_balance_paise = wallet_balance_paise + v_payout.amount_paise
        WHERE  id = v_payout.merchant_id;

        INSERT INTO wallet_transactions (
            user_id, merchant_id, transaction_type, amount,
            description, reference_type, reference_id
        )
        VALUES (
            v_payout.user_id,
            v_payout.merchant_id,
            'CREDIT',
            (v_payout.amount_paise::numeric / 100),
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

    -- 5. Audit event
    INSERT INTO payout_request_events (
        payout_id, actor_id, action, from_status, to_status, payload
    )
    VALUES (
        p_request_id, p_admin_user_id, 'rejected', v_from_status, 'rejected',
        jsonb_build_object('admin_note', p_admin_note)
    );

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Only callable via service_role (admin client); revoke from authenticated
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) TO service_role;


-- ---------------------------------------------------------------------------
-- 4. admin_approve_payout (use amount_paise + audit event + extended params)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin_approve_payout(
    p_payout_request_id uuid,
    p_admin_user_id     uuid,
    p_admin_note        text DEFAULT NULL,
    p_utr_reference     text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_payout  record;
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
    SET status        = 'released',
        reviewed_by   = p_admin_user_id,
        reviewed_at   = now(),
        admin_note    = COALESCE(p_admin_note, admin_note),
        utr_reference = COALESCE(p_utr_reference, utr_reference)
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

    -- 6. Insert merchant_transactions ledger entry (use amount_paise column)
    INSERT INTO merchant_transactions (
        merchant_id,
        transaction_type,
        amount_paise,
        balance_after_paise,
        description
    ) VALUES (
        v_payout.merchant_id,
        'payout',
        v_payout.amount_paise,
        v_balance,
        'Payout released: ₹' || (v_payout.amount_paise::numeric / 100)::text
    );

    -- 7. Audit event
    INSERT INTO payout_request_events (
        payout_id, actor_id, action, from_status, to_status, payload
    )
    VALUES (
        p_payout_request_id, p_admin_user_id, 'released', 'approved', 'released',
        jsonb_build_object(
            'utr_reference', p_utr_reference,
            'admin_note',    p_admin_note
        )
    );

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Only callable via service_role (admin client)
REVOKE EXECUTE ON FUNCTION admin_approve_payout(uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_approve_payout(uuid, uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION admin_approve_payout(uuid, uuid, text, text) TO service_role;
