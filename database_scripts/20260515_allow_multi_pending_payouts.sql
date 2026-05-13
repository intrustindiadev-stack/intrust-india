-- =============================================================================
-- Migration: 20260515_allow_multi_pending_payouts
-- Purpose  : • Removes the unconditional duplicate_pending guard (step 9 of
--              20260514 version) — the count check is now skipped when
--              payout_max_pending_count is NULL (= unlimited).
--            • Renames the cap error from duplicate_pending →
--              pending_count_exceeded for clarity.
--            • Adds a contract-scoped growth_fund_already_requested error
--              inside the growth_fund branch, so a second request on the same
--              matured contract returns 409 instead of 400 contract_not_matured.
--            • Sets payout_max_pending_count = NULL (unlimited) in the seed
--              table so multi-pending wallets are allowed by default.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- A. merchant_request_payout (re-deploy with surgical edits)
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
    v_balance_before    bigint;
    v_bank_account      text;
    v_bank_ifsc         text;
    v_bank_holder       text;
    v_bank_name         text;
    v_day_total         bigint;
    v_month_total       bigint;
    v_pending_count     bigint;
BEGIN
    -- 0. Read all velocity-limit settings in one pass
    --    NOTE: payout_max_pending_count has NO COALESCE fallback — NULL means unlimited.
    SELECT
        COALESCE(MAX(CASE WHEN key = 'payout_min_amount_paise'    THEN value::bigint END), 10000) AS min_paise,
        MAX(CASE WHEN key = 'payout_max_amount_paise'    THEN value::bigint END)                  AS max_paise,
        MAX(CASE WHEN key = 'payout_max_per_day_paise'   THEN value::bigint END)                  AS max_day_paise,
        MAX(CASE WHEN key = 'payout_max_per_month_paise' THEN value::bigint END)                  AS max_month_paise,
        MAX(CASE WHEN key = 'payout_max_pending_count'   THEN value::bigint END)                  AS max_pending_count
    INTO v_settings
    FROM platform_settings
    WHERE key IN (
        'payout_min_amount_paise', 'payout_max_amount_paise',
        'payout_max_per_day_paise', 'payout_max_per_month_paise',
        'payout_max_pending_count'
    );

    v_min_paise         := v_settings.min_paise;
    v_max_paise         := v_settings.max_paise;         -- NULL means unlimited
    v_max_day_paise     := v_settings.max_day_paise;     -- NULL means unlimited
    v_max_month_paise   := v_settings.max_month_paise;   -- NULL means unlimited
    v_max_pending_count := v_settings.max_pending_count; -- NULL means unlimited

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

    -- 9. Velocity: max simultaneous pending requests (per source) — SKIPPED when cap is NULL (unlimited)
    IF v_max_pending_count IS NOT NULL THEN
        SELECT COUNT(*)
        INTO   v_pending_count
        FROM   payout_requests
        WHERE  merchant_id   = v_merchant.id
          AND  payout_source = p_source
          AND  status        = 'pending';

        IF v_pending_count >= v_max_pending_count THEN
            RETURN jsonb_build_object('success', false, 'error', 'pending_count_exceeded');
        END IF;
    END IF;

    -- 10. Source-specific debit / contract lock
    IF p_source = 'wallet' THEN
        v_balance_before := v_merchant.wallet_balance_paise;

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

        -- Contract-scoped duplicate guard: detect a payout already in flight
        IF v_contract.status = 'payout_requested' THEN
            RETURN jsonb_build_object('success', false, 'error', 'growth_fund_already_requested');
        END IF;

        -- Only matured contracts may be paid out
        IF v_contract.status <> 'matured' THEN
            RETURN jsonb_build_object('success', false, 'error', 'contract_not_matured');
        END IF;

        IF (v_contract.amount_paise + COALESCE(v_contract.accumulated_interest_paise, 0)) <> p_amount_paise THEN
            RETURN jsonb_build_object('success', false, 'error', 'incorrect_maturity_amount');
        END IF;

        UPDATE merchant_lockin_balances
        SET    status = 'payout_requested'
        WHERE  id     = p_reference_id;

        v_balance_before := NULL;
        v_new_balance    := NULL;

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

    -- 12. Insert payout_request
    INSERT INTO payout_requests (
        merchant_id, user_id, amount, status,
        bank_account_number, bank_ifsc, bank_account_holder, bank_name,
        payout_source, reference_id,
        idempotency_key, requested_ip, requested_user_agent
    )
    VALUES (
        v_merchant.id, p_user_id, (p_amount_paise::numeric / 100), 'pending',
        v_bank_account, v_bank_ifsc, v_bank_holder, v_bank_name,
        p_source, p_reference_id,
        p_idempotency_key, p_requested_ip, p_requested_user_agent
    )
    RETURNING id INTO v_request_id;

    -- 13. Wallet transaction audit trail (wallet branch only)
    IF p_source = 'wallet' THEN
        INSERT INTO wallet_transactions (
            user_id, merchant_id, transaction_type, amount,
            balance_before, balance_after,
            description, reference_type, reference_id
        )
        VALUES (
            p_user_id,
            v_merchant.id,
            'DEBIT',
            (p_amount_paise::numeric / 100),
            (v_balance_before::numeric / 100),
            (v_new_balance::numeric  / 100),
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
-- B. Seed update — set unlimited as the new default
-- ---------------------------------------------------------------------------
UPDATE public.platform_settings
SET
    value       = NULL,
    description = 'Max simultaneous pending payout requests per source per merchant (NULL = unlimited)'
WHERE key = 'payout_max_pending_count';


-- ---------------------------------------------------------------------------
-- ROLLBACK STUB (commented out — run manually to revert)
-- ---------------------------------------------------------------------------
-- To revert to the 20260514 behaviour (hard cap = 1, duplicate_pending error):
--
-- CREATE OR REPLACE FUNCTION merchant_request_payout(
--     p_user_id              uuid,
--     p_amount_paise         bigint,
--     p_source               text,
--     p_reference_id         uuid,
--     p_idempotency_key      text,
--     p_requested_ip         text DEFAULT NULL,
--     p_requested_user_agent text DEFAULT NULL
-- )
-- RETURNS jsonb
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- ... (paste body from 20260514_update_payout_rpcs.sql lines 28-277) ...
-- $$;
--
-- GRANT EXECUTE ON FUNCTION merchant_request_payout(uuid, bigint, text, uuid, text, text, text) TO authenticated;
--
-- UPDATE public.platform_settings
-- SET value = '1'
-- WHERE key = 'payout_max_pending_count';
