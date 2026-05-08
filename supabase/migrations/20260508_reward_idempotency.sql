-- ============================================================================
-- IDEMPOTENCY: Reward transactions uniqueness guard
-- Date: 2026-05-08
-- Description:
--   Add a unique partial index on reward_transactions that covers the
--   effective reward identity for distributed-reward events:
--     (user_id, source_user_id, event_type, level, reference_id)
--   This prevents callback retries from crediting the same purchase twice.
--
--   Note: manual_credit, manual_debit, wallet_conversion, expiry, and
--   daily_login events are excluded from this constraint because they either
--   have no reference_id or legitimately recur without a reference.
-- ============================================================================

-- Partial unique index: only applies when reference_id is not null and
-- the event is a distribution event (signup, purchase, kyc_complete, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_txn_idempotent
    ON public.reward_transactions (user_id, source_user_id, event_type, level, reference_id)
    WHERE reference_id IS NOT NULL
      AND event_type NOT IN ('manual_credit', 'manual_debit', 'wallet_conversion', 'expiry', 'daily_login');

COMMENT ON INDEX public.idx_reward_txn_idempotent IS
    'Prevents duplicate reward distributions for the same event/reference/level combination';

-- ============================================================================
-- Update calculate_and_distribute_rewards to be idempotent
-- Uses ON CONFLICT DO NOTHING on the unique index above, and only updates
-- the balance + daily cap when a new transaction row was actually inserted.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_and_distribute_rewards(
    p_event_type TEXT,
    p_source_user_id UUID,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_amount_paise BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config JSONB;
    v_ancestor RECORD;
    v_points BIGINT;
    v_tier_multiplier NUMERIC;
    v_daily_cap BIGINT;
    v_earned_today BIGINT;
    v_balance_record RECORD;
    v_eligibility JSONB;
    v_source_profile RECORD;
    v_total_distributed BIGINT := 0;
    v_rows_inserted INT;
BEGIN
    -- 1. Fetch active configuration for this event
    SELECT config_value INTO v_config
    FROM public.reward_configuration
    WHERE config_key = p_event_type || '_reward' AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No active config for event: ' || p_event_type);
    END IF;

    -- 2. Fetch eligibility rules
    SELECT config_value INTO v_eligibility
    FROM public.reward_configuration
    WHERE config_key = 'eligibility' AND is_active = true;

    -- 3. Get source user profile for eligibility checks
    SELECT kyc_status, created_at INTO v_source_profile
    FROM public.user_profiles
    WHERE id = p_source_user_id;

    -- 4. Get all ancestors (upline)
    FOR v_ancestor IN
        SELECT ancestor_id, level
        FROM public.reward_tree_paths
        WHERE descendant_id = p_source_user_id
        ORDER BY level
    LOOP
        -- 5. Check if this level is configured
        IF v_config->>('L' || v_ancestor.level) IS NULL THEN
            CONTINUE;
        END IF;

        -- 6. Get ancestor balance/tier info
        SELECT * INTO v_balance_record
        FROM public.reward_points_balance
        WHERE user_id = v_ancestor.ancestor_id;

        IF NOT FOUND THEN
            -- Create balance record if missing
            INSERT INTO public.reward_points_balance (user_id) VALUES (v_ancestor.ancestor_id)
            ON CONFLICT (user_id) DO NOTHING;
            SELECT * INTO v_balance_record
            FROM public.reward_points_balance
            WHERE user_id = v_ancestor.ancestor_id;
        END IF;

        -- 7. Check eligibility (KYC requirement)
        IF COALESCE(v_eligibility->>'require_kyc', 'false')::BOOLEAN THEN
            DECLARE
                v_ancestor_kyc TEXT;
            BEGIN
                SELECT kyc_status INTO v_ancestor_kyc
                FROM public.user_profiles
                WHERE id = v_ancestor.ancestor_id;
                IF v_ancestor_kyc NOT IN ('approved', 'verified') THEN
                    CONTINUE;
                END IF;
            END;
        END IF;

        -- 8. Calculate base points from config
        v_points := (v_config->>('L' || v_ancestor.level))::BIGINT;

        -- For purchase events, calculate based on amount
        IF p_event_type = 'purchase' AND p_amount_paise > 0 THEN
            v_points := (p_amount_paise * v_points / 10000); -- points per 100 rs
        END IF;

        -- 9. Apply tier multiplier
        SELECT (config_value->>'bonus_multiplier')::NUMERIC INTO v_tier_multiplier
        FROM public.reward_configuration
        WHERE config_key = 'tier_' || COALESCE(v_balance_record.tier, 'bronze') AND is_active = true;

        v_points := ROUND(v_points * COALESCE(v_tier_multiplier, 1));

        IF v_points <= 0 THEN CONTINUE; END IF;

        -- 10. Check daily cap
        SELECT points_earned_today INTO v_earned_today
        FROM public.reward_daily_caps
        WHERE user_id = v_ancestor.ancestor_id AND cap_date = CURRENT_DATE;

        SELECT (config_value->>'max_points')::BIGINT INTO v_daily_cap
        FROM public.reward_configuration WHERE config_key = 'daily_cap';

        IF COALESCE(v_earned_today, 0) + v_points > COALESCE(v_daily_cap, 999999999) THEN
            v_points := GREATEST(0, COALESCE(v_daily_cap, 999999999) - COALESCE(v_earned_today, 0));
        END IF;

        IF v_points <= 0 THEN CONTINUE; END IF;

        -- 11. Insert transaction with idempotency guard
        --     ON CONFLICT DO NOTHING relies on idx_reward_txn_idempotent.
        --     GET DIAGNOSTICS tells us if a row was actually inserted so we
        --     can skip the balance/cap update on retries.
        INSERT INTO public.reward_transactions (
            user_id, source_user_id, event_type, points, points_before, points_after,
            level, reference_id, reference_type, description
        )
        VALUES (
            v_ancestor.ancestor_id, p_source_user_id, p_event_type::reward_event_type,
            v_points, v_balance_record.current_balance, v_balance_record.current_balance + v_points,
            v_ancestor.level, p_reference_id, p_reference_type,
            'Reward from ' || p_event_type || ' at level ' || v_ancestor.level
        )
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

        -- Only update balance and caps when this is a genuine new insertion
        IF v_rows_inserted = 0 THEN
            CONTINUE; -- already processed; skip
        END IF;

        UPDATE public.reward_points_balance
        SET current_balance = current_balance + v_points,
            total_earned = total_earned + v_points,
            updated_at = now()
        WHERE user_id = v_ancestor.ancestor_id;

        -- 12. Update user_profiles total
        UPDATE public.user_profiles
        SET total_reward_points_earned = COALESCE(total_reward_points_earned, 0) + v_points
        WHERE id = v_ancestor.ancestor_id;

        -- 13. Update daily cap tracking
        INSERT INTO public.reward_daily_caps (user_id, cap_date, points_earned_today, transactions_today)
        VALUES (v_ancestor.ancestor_id, CURRENT_DATE, v_points, 1)
        ON CONFLICT (user_id, cap_date)
        DO UPDATE SET
            points_earned_today = reward_daily_caps.points_earned_today + v_points,
            transactions_today = reward_daily_caps.transactions_today + 1,
            last_updated = now();

        v_total_distributed := v_total_distributed + v_points;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'total_distributed', v_total_distributed, 'message', 'Rewards distributed');
END;
$$;
