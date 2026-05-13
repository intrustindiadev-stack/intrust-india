-- =============================================================================
-- Migration: 20260513_payout_audit_columns
-- Purpose  : Add audit columns to payout_requests, replace admin_approve_payout
--            with a 4-param signature (including utr_reference and admin_note),
--            update admin_reject_payout to stamp rejected_by/at, and create
--            the payout_pii_access_log table.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. New audit columns on payout_requests (all idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE payout_requests
    ADD COLUMN IF NOT EXISTS utr_reference     TEXT        NULL,
    ADD COLUMN IF NOT EXISTS approved_by       UUID        REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS released_by       UUID        REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS released_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_by       UUID        REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ;

-- Generated column: amount in paise (avoids duplicate logic across code)
ALTER TABLE payout_requests
    ADD COLUMN IF NOT EXISTS amount_paise BIGINT
        GENERATED ALWAYS AS ((amount * 100)::bigint) STORED;


-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows using reviewed_by / reviewed_at
-- ---------------------------------------------------------------------------
UPDATE payout_requests
SET    released_by = reviewed_by,
       released_at = reviewed_at
WHERE  status = 'released'
  AND  released_by IS NULL;

UPDATE payout_requests
SET    approved_by = reviewed_by,
       approved_at = reviewed_at
WHERE  status = 'approved'
  AND  approved_by IS NULL;

UPDATE payout_requests
SET    rejected_by = reviewed_by,
       rejected_at = reviewed_at
WHERE  status = 'rejected'
  AND  rejected_by IS NULL;


-- ---------------------------------------------------------------------------
-- 3. Replace admin_approve_payout with new 4-param signature
--    (p_admin_note + p_utr_reference)
--    Guard: payout_requests.status must be 'approved'
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS admin_approve_payout(uuid, uuid);

CREATE OR REPLACE FUNCTION admin_approve_payout(
    p_payout_request_id uuid,
    p_admin_user_id     uuid,
    p_admin_note        text,
    p_utr_reference     text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payout          record;
    v_new_balance     bigint;
BEGIN
    -- 1. Lock the payout request row
    SELECT *
    INTO   v_payout
    FROM   payout_requests
    WHERE  id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_found');
    END IF;

    -- 2. Guard: must be in 'approved' state to release
    IF v_payout.status <> 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_approved');
    END IF;

    -- 3. Source-specific release logic
    IF v_payout.payout_source = 'growth_fund' THEN
        -- Mark the lockin contract as paid_out
        UPDATE merchant_lockin_balances
        SET    status = 'paid_out'
        WHERE  id = v_payout.reference_id;

        -- Wallet is untouched; record balance as-is
        SELECT wallet_balance_paise
        INTO   v_new_balance
        FROM   merchants
        WHERE  id = v_payout.merchant_id;

        -- Ledger entry (informational — no money movement)
        INSERT INTO merchant_transactions (
            merchant_id, amount, transaction_type,
            description, reference_type, reference_id,
            balance_after_paise
        )
        VALUES (
            v_payout.merchant_id,
            v_payout.amount,
            'DEBIT',
            'Growth fund payout, wallet untouched',
            'payout_request',
            p_payout_request_id,
            v_new_balance
        );

    ELSE
        -- Wallet branch: wallet was already debited at request time.
        -- Re-read the current balance for the ledger row.
        SELECT wallet_balance_paise
        INTO   v_new_balance
        FROM   merchants
        WHERE  id = v_payout.merchant_id;

        -- Ledger entry (debit was already applied at request time)
        INSERT INTO merchant_transactions (
            merchant_id, amount, transaction_type,
            description, reference_type, reference_id,
            balance_after_paise
        )
        VALUES (
            v_payout.merchant_id,
            v_payout.amount,
            'DEBIT',
            'Wallet payout released — UTR: ' || COALESCE(p_utr_reference, 'N/A'),
            'payout_request',
            p_payout_request_id,
            v_new_balance
        );
    END IF;

    -- 4. Mark the payout request as released
    --    Do NOT overwrite reviewed_by/reviewed_at (approval stamp)
    UPDATE payout_requests
    SET    status         = 'released',
           utr_reference  = p_utr_reference,
           admin_note     = p_admin_note,
           released_by    = p_admin_user_id,
           released_at    = now()
    WHERE  id = p_payout_request_id;

    RETURN jsonb_build_object(
        'success',     true,
        'request_id',  p_payout_request_id,
        'released_at', now()
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Only callable via service_role (admin client)
REVOKE EXECUTE ON FUNCTION admin_approve_payout(uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_approve_payout(uuid, uuid, text, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION admin_approve_payout(uuid, uuid, text, text) TO service_role;


-- ---------------------------------------------------------------------------
-- 4. Update admin_reject_payout to also stamp rejected_by / rejected_at
--    (Replaces the existing function in-place)
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

    -- 4. Update the payout request (now also stamps rejected_by/at)
    UPDATE payout_requests
    SET    status      = 'rejected',
           admin_note  = p_admin_note,
           reviewed_by = p_admin_user_id,
           reviewed_at = now(),
           rejected_by = p_admin_user_id,
           rejected_at = now()
    WHERE  id = p_request_id;

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Only callable via service_role (admin client)
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) TO service_role;


-- ---------------------------------------------------------------------------
-- 5. New table: payout_pii_access_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payout_pii_access_log (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id     UUID        NOT NULL REFERENCES payout_requests(id) ON DELETE CASCADE,
    admin_user_id UUID        NOT NULL REFERENCES auth.users(id),
    accessed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip            TEXT
);

-- Enable RLS
ALTER TABLE payout_pii_access_log ENABLE ROW LEVEL SECURITY;

-- service_role can INSERT (used by the API route via admin client)
CREATE POLICY "service_role_insert_pii_log"
    ON payout_pii_access_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- admin / super_admin can SELECT (via user profile role check in app layer)
CREATE POLICY "admin_select_pii_log"
    ON payout_pii_access_log
    FOR SELECT
    TO service_role
    USING (true);

-- Explicit grants
GRANT INSERT ON payout_pii_access_log TO service_role;
GRANT SELECT ON payout_pii_access_log TO service_role;
