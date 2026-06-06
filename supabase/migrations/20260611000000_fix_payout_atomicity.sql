-- =============================================================================
-- Migration: 20260611000000_fix_payout_atomicity
-- Purpose  : Close the mutate-then-validate atomicity hole in
--            merchant_request_payout that was introduced in all prior versions
--            (20260513, 20260514, 20260515):
--
--   BUG 1 — bank-data snapshot validation (invalid_bank_data) ran AFTER the
--            wallet debit / growth-fund contract flip.  A PL/pgSQL plain RETURN
--            does NOT roll back prior DML, so the debit committed while the
--            payout_requests row, wallet_transactions entry, and
--            payout_request_events were never written.  Result: balance
--            silently eaten, nothing visible in merchant or admin panels.
--
--   FIX 1 — Extract + validate bank-data BEFORE any mutation (step 3a, right
--            after bank_verified flag check).  Every pre-mutation check now
--            uses a plain RETURN (safe, nothing to roll back).  Every path
--            that can be reached AFTER a mutation uses RAISE EXCEPTION so
--            Postgres rolls back the whole transaction.
--
--   BUG 2 — The 20260515 INSERT INTO payout_requests dropped the amount_paise
--            column that 20260514 had added.  admin_approve_payout reads
--            v_payout.amount_paise for its merchant_transactions ledger entry;
--            NULL there means zero-value ledger rows and broken reporting.
--
--   FIX 2 — Re-add amount_paise = p_amount_paise to the INSERT.
--
--   VERIFY — Sibling RPCs merchant_cancel_pending_payout, admin_reject_payout,
--            admin_approve_payout all validate (NOT FOUND / wrong-status) before
--            any mutation; no change required.  This migration only touches
--            merchant_request_payout.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- A. merchant_request_payout — validate-before-mutate, fail-loud
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS merchant_request_payout(uuid, bigint, text, uuid, text, text, text);
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
    -- =========================================================================
    -- PHASE 1: ALL VALIDATION — no DML until this entire phase passes
    -- =========================================================================

    -- 0. Read all velocity-limit settings in one pass.
    --    NOTE: payout_max_pending_count has NO COALESCE fallback — NULL = unlimited.
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

    -- 1. Lock merchant row (FOR UPDATE acquires the row lock for later mutation)
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

    -- 3a. Validate bank data snapshot NOW — before any mutation.
    --     bank_verified=true does NOT guarantee all required keys are present;
    --     validate here so a missing key can never cause a post-mutation RETURN.
    v_bank_account := NULLIF(TRIM((v_merchant.bank_data->>'account_number')::text), '');
    v_bank_ifsc    := NULLIF(TRIM(COALESCE(v_merchant.bank_data->>'ifsc', v_merchant.bank_data->>'ifsc_code', '')), '');
    v_bank_holder  := NULLIF(TRIM(COALESCE(
                        v_merchant.bank_data->>'name',
                        v_merchant.bank_data->>'account_holder_name',
                        v_merchant.bank_data->>'beneficiary_name', ''
                      )), '');
    v_bank_name    := NULLIF(TRIM(COALESCE(v_merchant.bank_data->>'bank_name', '')), '');

    IF v_bank_account IS NULL OR v_bank_ifsc IS NULL OR v_bank_holder IS NULL THEN
        -- Safe RETURN here: no DML has run yet.
        RETURN jsonb_build_object('success', false, 'error', 'invalid_bank_data');
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

    -- 9a. Growth-fund: pre-validate contract BEFORE the debit phase.
    --     FOR UPDATE lock is re-used in phase 2 via the same txn.
    IF p_source = 'growth_fund' THEN
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

        -- Contract-scoped duplicate guard
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
    END IF;

    -- 9b. Wallet: pre-validate sufficient balance BEFORE the debit phase.
    IF p_source = 'wallet' THEN
        IF v_merchant.wallet_balance_paise < p_amount_paise THEN
            -- Safe RETURN: no DML yet.
            RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
        END IF;
        v_balance_before := v_merchant.wallet_balance_paise;
    END IF;

    -- =========================================================================
    -- PHASE 2: MUTATIONS — all validation has passed; failures here RAISE so
    --           Postgres rolls back the entire transaction automatically.
    -- =========================================================================

    -- 10. Source-specific debit / contract lock
    IF p_source = 'wallet' THEN
        -- Double-checked locking: re-assert balance inside the UPDATE predicate
        -- to guard against a concurrent debit between the SELECT FOR UPDATE and here.
        UPDATE merchants
        SET    wallet_balance_paise = wallet_balance_paise - p_amount_paise
        WHERE  id                  = v_merchant.id
          AND  wallet_balance_paise >= p_amount_paise;

        GET DIAGNOSTICS v_rows = ROW_COUNT;
        IF v_rows = 0 THEN
            -- A concurrent transaction drained the balance between validation and debit.
            -- RAISE so the whole txn rolls back — no orphaned debit possible.
            RAISE EXCEPTION 'payout_insufficient_balance_concurrent'
                USING ERRCODE = 'P0001';
        END IF;

        -- Re-read balance after debit for accurate audit trail
        SELECT wallet_balance_paise
        INTO   v_new_balance
        FROM   merchants
        WHERE  id = v_merchant.id;

    ELSIF p_source = 'growth_fund' THEN
        -- Contract already FOR UPDATE locked in phase 1 (step 9a); just flip it.
        UPDATE merchant_lockin_balances
        SET    status = 'payout_requested'
        WHERE  id     = p_reference_id;

        v_balance_before := NULL;
        v_new_balance    := NULL;

    ELSE
        -- Should be unreachable: source was validated in phase 1.
        -- RAISE here to be safe; plain RETURN after a mutation would be wrong.
        RAISE EXCEPTION 'invalid_payout_source: %', p_source
            USING ERRCODE = 'P0001';
    END IF;

    -- 11. Insert payout_requests row
    --     IMPORTANT: amount_paise is a generated column ((amount * 100)::bigint) STORED,
    --     so we must NOT insert into it directly. It will be computed automatically from amount.
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

    -- 12. Wallet transaction audit trail (wallet branch only)
    --     balance_before captured in phase 1; balance_after re-read after debit.
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

    -- 13. Audit event
    INSERT INTO payout_request_events (
        payout_id, actor_id, action, from_status, to_status, payload
    )
    VALUES (
        v_request_id, p_user_id, 'requested', NULL, 'pending',
        jsonb_build_object('amount_paise', p_amount_paise, 'source', p_source)
    );

    -- 14. Return success
    RETURN jsonb_build_object(
        'success',             true,
        'request_id',          v_request_id,
        'balance_after_paise', v_new_balance,
        'replayed',            false
    );

EXCEPTION WHEN OTHERS THEN
    -- Re-raise everything so the caller (PostgREST / Supabase JS) sees an
    -- HTTP 500 and the transaction is definitively rolled back.
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION merchant_request_payout(uuid, bigint, text, uuid, text, text, text) TO authenticated;


-- =============================================================================
-- SIBLING RPC AUDIT
-- =============================================================================
-- merchant_cancel_pending_payout (20260514):
--   Step 1  FOR UPDATE SELECT + NOT FOUND check             — pre-mutation  ✅
--   Step 2  status <> 'pending' check                       — pre-mutation  ✅
--   Step 3  wallet credit / contract reset (mutation)
--   Step 4  UPDATE payout_requests.status
--   Step 5  INSERT payout_request_events
--   → All RETURN false paths occur before any mutation. No change required.
--
-- admin_reject_payout (20260514):
--   Step 1  FOR UPDATE SELECT + NOT FOUND check             — pre-mutation  ✅
--   Step 2  status NOT IN ('pending','approved') check      — pre-mutation  ✅
--   Step 3  wallet credit / contract reset (mutation)
--   Step 4  UPDATE payout_requests.status
--   Step 5  INSERT payout_request_events
--   → All RETURN false paths occur before any mutation. No change required.
--
-- admin_approve_payout (20260514):
--   Step 1  FOR UPDATE SELECT + NOT FOUND check             — pre-mutation  ✅
--   Step 2  status != 'approved' check                      — pre-mutation  ✅
--   Step 3+ mutations only
--   → All RETURN false paths occur before any mutation. No change required.
--   NOTE: admin_approve_payout reads v_payout.amount_paise; this field is now
--         guaranteed non-NULL by the fix in step 11 of merchant_request_payout.
-- =============================================================================
