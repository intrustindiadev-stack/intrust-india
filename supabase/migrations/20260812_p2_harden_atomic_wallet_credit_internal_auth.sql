-- ============================================================================
-- MIGRATION: 20260812_p2_harden_atomic_wallet_credit_internal_auth.sql
--
-- PURPOSE:
--   Adds an internal authentication check to atomic_customer_wallet_credit.
--   
--   Even though we've revoked the EXECUTE grant from anon/authenticated,
--   defense-in-depth requires the function itself to validate the caller.
--   
--   The function should ONLY be callable by:
--   1. Service role (server-side Next.js API routes)
--   2. Other SECURITY DEFINER functions (e.g. finalize_gateway_orders)
--
--   When called by service_role: current_setting('request.jwt.claims', true)
--   will be NULL. This is the expected path for all legitimate callers.
--   
--   When called by an authenticated user directly (e.g. via supabase.rpc()):
--   auth.uid() will be non-null. In this case, we REJECT the call.
--
-- RATIONALE:
--   This implements defense-in-depth. The primary security control is the
--   REVOKE migration. This is a secondary check inside the function itself.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.atomic_customer_wallet_credit(
    p_user_id        uuid,
    p_amount_paise   bigint,
    p_type           text,
    p_description    text,
    p_reference_id   text,
    p_reference_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
-- NOTE: No SET search_path here because this function was already deployed
-- without it and changing search_path can break existing object resolution.
-- The REVOKE grants are the primary defense.
AS $function$
DECLARE
    v_wallet_id      UUID;
    v_balance_before BIGINT;
    v_balance_after  BIGINT;
    v_tx_id          UUID;
BEGIN
    -- ── SECURITY CHECK: Reject direct calls from authenticated users ───────────
    -- This function is designed to be called ONLY by server-side service role
    -- code (Next.js API routes, payment callbacks) or by other SECURITY DEFINER
    -- functions internally. If auth.uid() is non-null, it means an authenticated
    -- user is calling this directly via supabase.rpc() — which is unauthorized.
    --
    -- Legitimate callers (service_role, other SECURITY DEFINER functions) will
    -- have auth.uid() = NULL in the database session context.
    IF auth.uid() IS NOT NULL THEN
        RAISE EXCEPTION 'atomic_customer_wallet_credit: Direct user invocation is not permitted. Use server-side API routes.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- ── Input validation ───────────────────────────────────────────────────────
    IF p_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'p_user_id is required');
    END IF;

    IF p_amount_paise IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'p_amount_paise is required');
    END IF;

    -- 1. Ensure wallet exists and lock it for update
    INSERT INTO public.customer_wallets (user_id, balance_paise, status)
    VALUES (p_user_id, 0, 'ACTIVE')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance_paise INTO v_wallet_id, v_balance_before
    FROM public.customer_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Wallet not found for user');
    END IF;

    -- 2. Calculate new balance
    v_balance_after := v_balance_before + p_amount_paise;

    -- Guard against negative balance (for debit operations)
    IF v_balance_after < 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Insufficient wallet balance',
            'balance_before', v_balance_before,
            'attempted_debit', p_amount_paise
        );
    END IF;

    -- 3. Update wallet and insert transaction inside a nested block
    -- This ensures that if the unique constraint (e.g. for TOPUPs) fires,
    -- the balance update is atomically rolled back with the insert.
    BEGIN
        UPDATE public.customer_wallets
        SET balance_paise = v_balance_after, updated_at = now()
        WHERE id = v_wallet_id;

        INSERT INTO public.customer_wallet_transactions (
            wallet_id, user_id, type, amount_paise,
            balance_before_paise, balance_after_paise,
            description, reference_id, reference_type
        ) VALUES (
            v_wallet_id, p_user_id, p_type, p_amount_paise,
            v_balance_before, v_balance_after,
            p_description, p_reference_id, p_reference_type
        ) RETURNING id INTO v_tx_id;

    EXCEPTION WHEN unique_violation THEN
        -- Rollback occurs for the nested block only (wallet update and tx insert)
        RETURN json_build_object('success', false, 'duplicate', true, 'message', 'Unique constraint violation');
    END;

    RETURN json_build_object(
        'success', true,
        'duplicate', false,
        'wallet_id', v_wallet_id,
        'transaction_id', v_tx_id,
        'balance_after_paise', v_balance_after
    );
END;
$function$;

-- ─── Log ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'Security hardening P2: atomic_customer_wallet_credit now rejects direct user calls.';
END $$;
