-- ============================================================================
-- SECURITY: Restrict reward-mutating SECURITY DEFINER RPCs
-- Date: 2026-05-08
-- Description:
--   1. Revoke default EXECUTE on reward-mutating functions from PUBLIC and
--      the `authenticated` role, then grant only to service_role.
--   2. Add an in-function authorization check to convert_points_to_wallet
--      so self-service callers must own the target user_id (auth.uid() == p_user_id),
--      and enforce redemption_mode inside the DB path as well.
-- ============================================================================

-- ── 1. Revoke broad EXECUTE grants ───────────────────────────────────────────
-- These functions use SECURITY DEFINER and can bypass RLS.
-- Only service_role (called from trusted server-side code) should execute them.

REVOKE EXECUTE ON FUNCTION public.convert_points_to_wallet(UUID, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.convert_points_to_wallet(UUID, BIGINT) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(TEXT, UUID, UUID, TEXT, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(TEXT, UUID, UUID, TEXT, BIGINT) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.build_reward_tree_path(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.build_reward_tree_path(UUID, UUID) FROM authenticated;

-- Grant back to service_role so server-side API routes can still call them.
GRANT EXECUTE ON FUNCTION public.convert_points_to_wallet(UUID, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_and_distribute_rewards(TEXT, UUID, UUID, TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.build_reward_tree_path(UUID, UUID) TO service_role;

-- ── 2. Harden convert_points_to_wallet ───────────────────────────────────────
-- Replace the function body to add:
--   a) Authorization guard: auth.uid() must match p_user_id for non-service callers.
--   b) redemption_mode check: if mode is 'approval_required', reject direct conversions
--      and instruct the caller to use the pending-request path.

CREATE OR REPLACE FUNCTION public.convert_points_to_wallet(
    p_user_id UUID,
    p_points BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_uid UUID;
    v_point_value NUMERIC;
    v_rupee_paise BIGINT;
    v_current_points BIGINT;
    v_min_withdrawal BIGINT;
    v_wallet_id UUID;
    v_wallet_balance BIGINT;
    v_redemption_mode TEXT;
BEGIN
    -- ── Authorization guard ────────────────────────────────────────────────
    -- When called from an authenticated (non-service-role) context, the JWT
    -- must belong to the target user. service_role calls pass NULL for uid().
    v_caller_uid := auth.uid();
    IF v_caller_uid IS NOT NULL AND v_caller_uid <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Forbidden: you may only redeem your own points');
    END IF;

    -- ── redemption_mode enforcement ────────────────────────────────────────
    -- If the platform is in approval_required mode, block direct conversions
    -- so they are always routed through the pending-request approval flow.
    SELECT TRIM(BOTH '"' FROM config_value::TEXT) INTO v_redemption_mode
    FROM public.reward_configuration
    WHERE config_key = 'redemption_mode' AND is_active = true;

    IF COALESCE(v_redemption_mode, 'instant') = 'approval_required' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Redemption requires admin approval. Please submit a redemption request.'
        );
    END IF;

    -- ── Business validation ────────────────────────────────────────────────
    -- Check min withdrawal
    SELECT (config_value->>'min_withdrawal_points')::BIGINT INTO v_min_withdrawal
    FROM public.reward_configuration WHERE config_key = 'point_value';

    IF p_points < COALESCE(v_min_withdrawal, 100) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Below minimum withdrawal of ' || COALESCE(v_min_withdrawal, 100) || ' points');
    END IF;

    -- Get current balance
    SELECT current_balance INTO v_current_points FROM public.reward_points_balance WHERE user_id = p_user_id;
    IF v_current_points IS NULL OR v_current_points < p_points THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient points. Available: ' || COALESCE(v_current_points, 0));
    END IF;

    -- Calculate rupee value (points_per_rupee = how many points = 1 rupee)
    SELECT (config_value->>'points_per_rupee')::NUMERIC INTO v_point_value
    FROM public.reward_configuration WHERE config_key = 'point_value';

    v_rupee_paise := ROUND((p_points::NUMERIC / COALESCE(v_point_value, 1)) * 100);

    -- Deduct points
    UPDATE public.reward_points_balance
    SET current_balance = current_balance - p_points,
        total_redeemed = total_redeemed + p_points,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- Log reward transaction (debit)
    INSERT INTO public.reward_transactions (
        user_id, event_type, points, points_before, points_after,
        description, metadata
    )
    VALUES (
        p_user_id, 'wallet_conversion', -p_points,
        v_current_points, v_current_points - p_points,
        'Converted ' || p_points || ' Intrust Reward Points to wallet',
        jsonb_build_object('rupee_paise', v_rupee_paise, 'points_per_rupee', COALESCE(v_point_value, 1))
    );

    -- Credit customer wallet
    SELECT id, balance_paise INTO v_wallet_id, v_wallet_balance
    FROM public.customer_wallets WHERE user_id = p_user_id;

    IF v_wallet_id IS NULL THEN
        INSERT INTO public.customer_wallets (user_id, balance_paise)
        VALUES (p_user_id, v_rupee_paise)
        RETURNING id INTO v_wallet_id;
    ELSE
        UPDATE public.customer_wallets
        SET balance_paise = balance_paise + v_rupee_paise,
            updated_at = now()
        WHERE id = v_wallet_id;
    END IF;

    -- Insert wallet transaction
    INSERT INTO public.customer_wallet_transactions (
        wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise,
        description, reference_type
    )
    VALUES (
        v_wallet_id, p_user_id, 'REWARD', v_rupee_paise,
        COALESCE(v_wallet_balance, 0), COALESCE(v_wallet_balance, 0) + v_rupee_paise,
        'Intrust Reward Points conversion: ' || p_points || ' points = ₹' || (v_rupee_paise/100.0),
        'REWARD_CONVERSION'
    );

    RETURN jsonb_build_object('success', true, 'rupee_paise', v_rupee_paise, 'points_deducted', p_points);
END;
$$;
