-- ============================================================================
-- FIX: Daily Login Rewards and Direct Payouts
-- Date: 2026-05-08
-- Description:
--   1. Updates calculate_and_distribute_rewards to handle "direct" rewards
--      for the source user (Level 0).
--   2. Implements daily frequency check for "daily_login" event.
--   3. Ensures level 0 transactions are recorded correctly.
-- ============================================================================

UPDATE public.reward_configuration
SET config_value = config_value || '{
    "events": {
        "signup": { "direct_require_kyc": false, "upline_require_kyc": true },
        "daily_login": { "direct_require_kyc": false, "upline_require_kyc": true },
        "purchase": { "direct_require_kyc": true, "upline_require_kyc": true },
        "kyc_complete": { "direct_require_kyc": false, "upline_require_kyc": true },
        "merchant_onboard": { "direct_require_kyc": true, "upline_require_kyc": true },
        "subscription_renewal": { "direct_require_kyc": true, "upline_require_kyc": true }
    }
}'::jsonb
WHERE config_key = 'eligibility';

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
    v_points BIGINT;
    v_tier_multiplier NUMERIC;
    v_daily_cap BIGINT;
    v_earned_today BIGINT;
    v_balance_record RECORD;
    v_eligibility JSONB;
    v_event_eligibility JSONB;
    v_require_kyc BOOLEAN;
    v_source_profile RECORD;
    v_total_distributed BIGINT := 0;
    v_rows_inserted INT;
    v_ancestor RECORD;
BEGIN
    -- 1. Fetch active configuration for this event
    SELECT config_value INTO v_config
    FROM public.reward_configuration
    WHERE config_key = p_event_type || '_reward' AND is_active = true;

    IF NOT FOUND THEN
        -- Check for short-form key as fallback (though normalization should have handled it)
        SELECT config_value INTO v_config
        FROM public.reward_configuration
        WHERE config_key = p_event_type AND is_active = true;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'message', 'No active config for event: ' || p_event_type);
        END IF;
    END IF;

    -- 2. Check Daily Login Frequency (Once per day)
    IF p_event_type = 'daily_login' THEN
        IF EXISTS (
            SELECT 1 FROM public.reward_transactions 
            WHERE user_id = p_source_user_id 
              AND event_type = 'daily_login' 
              AND created_at >= CURRENT_DATE
        ) THEN
            RETURN jsonb_build_object('success', true, 'message', 'Daily login reward already claimed for today');
        END IF;
    END IF;

    -- 3. Fetch eligibility rules
    SELECT config_value INTO v_eligibility
    FROM public.reward_configuration
    WHERE config_key = 'eligibility' AND is_active = true;

    -- 4. Get source user profile
    SELECT kyc_status, created_at INTO v_source_profile
    FROM public.user_profiles
    WHERE id = p_source_user_id;

    -- 5. Prepare a virtual list of reward targets (Source User + Ancestors)
    --    We use Level 0 to represent the source user themselves (for "direct" reward)
    FOR v_ancestor IN
        (
            -- Source User (Level 0)
            SELECT p_source_user_id as target_id, 0 as level
            UNION ALL
            -- Ancestors (Level 1+)
            SELECT ancestor_id as target_id, level
            FROM public.reward_tree_paths
            WHERE descendant_id = p_source_user_id
        )
        ORDER BY level
    LOOP
        -- 6. Determine base points for this level
        v_points := 0;
        IF v_ancestor.level = 0 THEN
            IF v_config->>'direct' IS NOT NULL THEN
                v_points := (v_config->>'direct')::BIGINT;
            END IF;
        ELSE
            IF v_config->>('L' || v_ancestor.level) IS NOT NULL THEN
                v_points := (v_config->>('L' || v_ancestor.level))::BIGINT;
            END IF;
        END IF;

        IF v_points = 0 THEN CONTINUE; END IF;

        -- 7. For purchase events, calculate based on amount (only for L1+ usually, but we allow it for L0 if configured)
        IF p_event_type = 'purchase' AND p_amount_paise > 0 THEN
            -- If points config is "rate per 100", treat it as percentage/scaling
            -- purchase_reward config: {"rate_per_100rs": 5, ...}
            IF v_ancestor.level = 0 AND v_config->>'rate_per_100rs' IS NOT NULL THEN
                v_points := (p_amount_paise * (v_config->>'rate_per_100rs')::BIGINT / 10000);
            ELSE
                v_points := (p_amount_paise * v_points / 10000);
            END IF;
        END IF;

        -- 8. Get target balance/tier info
        SELECT * INTO v_balance_record
        FROM public.reward_points_balance
        WHERE user_id = v_ancestor.target_id;

        IF NOT FOUND THEN
            INSERT INTO public.reward_points_balance (user_id) VALUES (v_ancestor.target_id)
            ON CONFLICT (user_id) DO NOTHING;
            SELECT * INTO v_balance_record
            FROM public.reward_points_balance
            WHERE user_id = v_ancestor.target_id;
        END IF;

        -- 9. Check event/level eligibility. Default to the global KYC rule,
        --    with per-event overrides for direct and upline payouts.
        v_event_eligibility := COALESCE(v_eligibility->'events'->p_event_type, '{}'::jsonb);
        IF v_ancestor.level = 0 THEN
            v_require_kyc := COALESCE(
                (v_event_eligibility->>'direct_require_kyc')::BOOLEAN,
                (v_eligibility->>'require_kyc')::BOOLEAN,
                false
            );
        ELSE
            v_require_kyc := COALESCE(
                (v_event_eligibility->>'upline_require_kyc')::BOOLEAN,
                (v_eligibility->>'require_kyc')::BOOLEAN,
                false
            );
        END IF;

        IF v_require_kyc THEN
            DECLARE
                v_target_kyc TEXT;
            BEGIN
                SELECT kyc_status INTO v_target_kyc
                FROM public.user_profiles
                WHERE id = v_ancestor.target_id;
                IF v_target_kyc NOT IN ('approved', 'verified') THEN
                    CONTINUE;
                END IF;
            END;
        END IF;

        -- 10. Apply tier multiplier
        SELECT (config_value->>'bonus_multiplier')::NUMERIC INTO v_tier_multiplier
        FROM public.reward_configuration
        WHERE config_key = 'tier_' || COALESCE(v_balance_record.tier, 'bronze') AND is_active = true;

        v_points := ROUND(v_points * COALESCE(v_tier_multiplier, 1));

        IF v_points <= 0 THEN CONTINUE; END IF;

        -- 11. Check daily cap
        SELECT points_earned_today INTO v_earned_today
        FROM public.reward_daily_caps
        WHERE user_id = v_ancestor.target_id AND cap_date = CURRENT_DATE;

        SELECT (config_value->>'max_points')::BIGINT INTO v_daily_cap
        FROM public.reward_configuration WHERE config_key = 'daily_cap';

        IF COALESCE(v_earned_today, 0) + v_points > COALESCE(v_daily_cap, 999999999) THEN
            v_points := GREATEST(0, COALESCE(v_daily_cap, 999999999) - COALESCE(v_earned_today, 0));
        END IF;

        IF v_points <= 0 THEN CONTINUE; END IF;

        -- 12. Insert transaction with idempotency guard
        INSERT INTO public.reward_transactions (
            user_id, source_user_id, event_type, points, points_before, points_after,
            level, reference_id, reference_type, description
        )
        VALUES (
            v_ancestor.target_id, p_source_user_id, p_event_type::reward_event_type,
            v_points, v_balance_record.current_balance, v_balance_record.current_balance + v_points,
            v_ancestor.level, p_reference_id, p_reference_type,
            CASE 
                WHEN v_ancestor.level = 0 THEN 'Direct reward for ' || p_event_type
                ELSE 'Referral reward from ' || p_event_type || ' at level ' || v_ancestor.level
            END
        )
        ON CONFLICT DO NOTHING;

        GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

        IF v_rows_inserted = 0 THEN
            CONTINUE;
        END IF;

        -- 13. Update balance
        UPDATE public.reward_points_balance
        SET current_balance = current_balance + v_points,
            total_earned = total_earned + v_points,
            updated_at = now()
        WHERE user_id = v_ancestor.target_id;

        -- 14. Update user_profiles total
        UPDATE public.user_profiles
        SET total_reward_points_earned = COALESCE(total_reward_points_earned, 0) + v_points
        WHERE id = v_ancestor.target_id;

        -- 15. Update daily cap tracking
        INSERT INTO public.reward_daily_caps (user_id, cap_date, points_earned_today, transactions_today)
        VALUES (v_ancestor.target_id, CURRENT_DATE, v_points, 1)
        ON CONFLICT (user_id, cap_date)
        DO UPDATE SET
            points_earned_today = reward_daily_caps.points_earned_today + v_points,
            transactions_today = reward_daily_caps.transactions_today + 1,
            last_updated = now();

        v_total_distributed := v_total_distributed + v_points;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'total_distributed', v_total_distributed, 
        'message', 'Rewards distributed successfully'
    );
END;
$$;
