-- =============================================================================
-- Migration: 20260719_fix_payout_amount_formatting
-- Purpose  : Fix payout remark string showing ugly float values like
--            "Rs.4000.0000000000000000" by using to_char() for clean formatting.
--            Fixes admin_approve_payout and any other RPCs with same issue.
-- =============================================================================

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

    -- 6. Insert merchant_transactions ledger entry
    -- Use to_char() to format the amount cleanly (e.g. "4000" not "4000.0000000000000000")
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
        'Payout released: ₹' || to_char(v_payout.amount_paise::numeric / 100, 'FM99,99,99,990.00')
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
