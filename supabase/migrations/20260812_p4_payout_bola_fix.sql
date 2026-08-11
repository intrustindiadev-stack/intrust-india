-- ============================================================================
-- MIGRATION: 20260812_p4_payout_bola_fix.sql
--
-- PURPOSE:
--   Modifies admin_approve_payout and admin_reject_payout to stop trusting 
--   the caller-supplied `p_admin_user_id`. Instead, the functions now derive 
--   the actor identity securely from `auth.uid()`.
--
-- RATIONALE:
--   Prior to this, a malicious authenticated admin could supply another admin's
--   ID to these functions to forge the audit trail (BOLA).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_approve_payout(
    p_payout_request_id uuid,
    p_admin_user_id uuid, -- KEPT FOR BACKWARDS COMPATIBILITY WITH API CLIENTS BUT IGNORED
    p_admin_note text DEFAULT NULL::text,
    p_utr_reference text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_payout  record;
    v_balance bigint;
    v_actual_admin_id uuid;
    v_admin_role text;
BEGIN
    -- 1. Securely derive the caller identity
    v_actual_admin_id := auth.uid();
    
    IF v_actual_admin_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Verify the caller has an admin role
    SELECT role::text INTO v_admin_role
    FROM public.user_profiles
    WHERE id = v_actual_admin_id;

    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;

    -- 2. Lock payout row
    SELECT * INTO v_payout
    FROM payout_requests
    WHERE id = p_payout_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payout request not found');
    END IF;

    -- 3. Guard: must be in 'approved' state
    IF v_payout.status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payout is not in approved state: ' || v_payout.status);
    END IF;

    -- 4. Update payout status
    UPDATE payout_requests
    SET status        = 'released',
        reviewed_by   = v_actual_admin_id, -- SECURE: Use derived ID
        reviewed_at   = now(),
        admin_note    = COALESCE(p_admin_note, admin_note),
        utr_reference = COALESCE(p_utr_reference, utr_reference)
    WHERE id = p_payout_request_id;

    -- 5. If growth fund, mark contract paid_out atomically
    IF v_payout.payout_source = 'growth_fund' AND v_payout.reference_id IS NOT NULL THEN
        UPDATE merchant_lockin_balances
        SET status = 'paid_out'
        WHERE id = v_payout.reference_id;
    END IF;

    -- 6. Read current (already pre-debited) wallet balance for ledger
    SELECT wallet_balance_paise INTO v_balance
    FROM merchants
    WHERE id = v_payout.merchant_id;

    -- 7. Insert merchant_transactions ledger entry
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

    -- 8. Audit event
    INSERT INTO payout_request_events (
        payout_id, actor_id, action, from_status, to_status, payload
    ) VALUES (
        p_payout_request_id, v_actual_admin_id, 'released', 'approved', 'released', -- SECURE: Use derived ID
        jsonb_build_object(
            'utr_reference', p_utr_reference,
            'admin_note',    p_admin_note
        )
    );

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_payout(
    p_request_id uuid,
    p_admin_user_id uuid, -- KEPT FOR BACKWARDS COMPATIBILITY WITH API CLIENTS BUT IGNORED
    p_admin_note text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_payout         record;
    v_from_status    text;
    v_balance_before bigint;
    v_balance_after  bigint;
    v_actual_admin_id uuid;
    v_admin_role text;
BEGIN
    -- 1. Securely derive the caller identity
    v_actual_admin_id := auth.uid();
    
    IF v_actual_admin_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Verify the caller has an admin role
    SELECT role::text INTO v_admin_role
    FROM public.user_profiles
    WHERE id = v_actual_admin_id;

    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;

    -- 2. Lock the payout request row
    SELECT * INTO v_payout
    FROM payout_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_found');
    END IF;

    v_from_status := v_payout.status;

    -- 3. Only pending or approved can be rejected
    IF v_payout.status NOT IN ('pending', 'approved') THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_rejectable');
    END IF;

    -- 4. Reverse the source-specific operation (use amount_paise column)
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

    -- 5. Update the payout request
    UPDATE payout_requests
    SET    status      = 'rejected',
           admin_note  = p_admin_note,
           reviewed_by = v_actual_admin_id, -- SECURE
           reviewed_at = now()
    WHERE  id = p_request_id;

    -- 6. Audit event
    INSERT INTO payout_request_events (
        payout_id, actor_id, action, from_status, to_status, payload
    )
    VALUES (
        p_request_id, v_actual_admin_id, 'rejected', v_from_status, 'rejected', -- SECURE
        jsonb_build_object('admin_note', p_admin_note)
    );

    RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$function$;
