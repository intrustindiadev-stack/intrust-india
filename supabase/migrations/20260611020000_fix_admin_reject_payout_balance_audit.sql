-- Migration: 20260611020000_fix_admin_reject_payout_balance_audit
-- Purpose  : Fix NOT NULL constraint violation on wallet_transactions in admin_reject_payout.
--            Populate balance_before and balance_after when inserting a CREDIT transaction 
--            for rejected payouts.

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
    v_payout         record;
    v_from_status    text;
    v_balance_before bigint;
    v_balance_after  bigint;
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
        -- Fetch current balance before refund
        SELECT wallet_balance_paise INTO v_balance_before
        FROM merchants
        WHERE id = v_payout.merchant_id
        FOR UPDATE;

        v_balance_after := v_balance_before + v_payout.amount_paise;

        UPDATE merchants
        SET    wallet_balance_paise = v_balance_after
        WHERE  id = v_payout.merchant_id;

        INSERT INTO wallet_transactions (
            user_id, merchant_id, transaction_type, amount,
            balance_before, balance_after,
            description, reference_type, reference_id
        )
        VALUES (
            v_payout.user_id,
            v_payout.merchant_id,
            'CREDIT',
            (v_payout.amount_paise::numeric / 100),
            (v_balance_before::numeric / 100),
            (v_balance_after::numeric / 100),
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

-- Keep grants in sync
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION admin_reject_payout(uuid, uuid, text) TO service_role;
