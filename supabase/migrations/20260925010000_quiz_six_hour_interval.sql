-- ==============================================================================
-- QUIZ 6-HOUR REFRESH INTERVAL & REVERSE TIMER SUPPORT
-- ==============================================================================
-- 1. Drops the unique constraint on (user_id, challenge_date) in daily_challenge_plays
--    so users can play every 6 hours (up to 4 times a day) instead of once per 24 hours.
-- 2. Adds index on (user_id, completed_at DESC) for fast cooldown queries.
-- 3. Updates get_user_quiz_streak() to return live 6-hour cooldown status & remaining seconds.
-- 4. Updates submit_daily_challenge() to enforce 6-hour cooldown instead of calendar-day lock,
--    while preserving daily streak continuity.

-- ── 1. DROP RESTRICTIVE 24-HOUR UNIQUE CONSTRAINT ──────────────────────────────
ALTER TABLE public.daily_challenge_plays 
    DROP CONSTRAINT IF EXISTS daily_challenge_plays_user_id_challenge_date_key;

-- ── 2. PERFORMANCE INDEX FOR RECENT PLAY LOOKUPS ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_daily_challenge_plays_user_completed 
    ON public.daily_challenge_plays(user_id, completed_at DESC);

-- ── 3. UPDATE get_user_quiz_streak WITH 6-HOUR COOLDOWN TRACKING ───────────────
CREATE OR REPLACE FUNCTION public.get_user_quiz_streak(
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_today_ist DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_current_month INTEGER := EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'))::integer;
    v_streak_record RECORD;
    v_played_today BOOLEAN := false;
    v_streak_intact BOOLEAN := false;
    v_max_freezes INTEGER := 1;
    v_freezes INTEGER := 1;
    v_streak INTEGER := 0;
    v_highest INTEGER := 0;
    v_last_completed_at TIMESTAMPTZ := NULL;
    v_cooldown_active BOOLEAN := false;
    v_cooldown_seconds_remaining INTEGER := 0;
    v_unlocks_at TIMESTAMPTZ := NULL;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Dynamic freeze allowance from marketing_settings
    SELECT COALESCE(
        (value->>'monthly_freezes_allowed')::integer,
        (value->>'monthly_freeze_allowance')::integer,
        1
    ) INTO v_max_freezes
    FROM public.marketing_settings WHERE key = 'streak_config';
    v_max_freezes := COALESCE(v_max_freezes, 1);
    v_freezes := v_max_freezes;

    -- Check user's most recent completed quiz for 6-hour cooldown
    SELECT completed_at INTO v_last_completed_at
    FROM public.daily_challenge_plays
    WHERE user_id = v_user_id
    ORDER BY completed_at DESC
    LIMIT 1;

    IF v_last_completed_at IS NOT NULL AND v_last_completed_at + INTERVAL '6 hours' > now() THEN
        v_cooldown_active := true;
        v_cooldown_seconds_remaining := GREATEST(0, EXTRACT(EPOCH FROM ((v_last_completed_at + INTERVAL '6 hours') - now()))::INTEGER);
        v_unlocks_at := v_last_completed_at + INTERVAL '6 hours';
    END IF;

    -- Check if played today in IST
    SELECT EXISTS (
        SELECT 1 FROM public.daily_challenge_plays
        WHERE user_id = v_user_id AND challenge_date = v_today_ist
    ) INTO v_played_today;

    SELECT * INTO v_streak_record 
    FROM public.user_quiz_streaks 
    WHERE user_id = v_user_id;

    IF v_streak_record.user_id IS NOT NULL THEN
        v_streak := v_streak_record.current_streak;
        v_highest := v_streak_record.highest_streak;
        v_freezes := v_streak_record.streak_freezes_left;

        -- Monthly reset for freeze tokens
        IF v_streak_record.freeze_reset_month != v_current_month THEN
            v_freezes := v_max_freezes;
            UPDATE public.user_quiz_streaks
            SET streak_freezes_left = v_max_freezes, freeze_reset_month = v_current_month
            WHERE user_id = v_user_id;
        END IF;

        -- If haven't played today, verify if yesterday in IST was played (streak intact)
        IF NOT v_played_today THEN
            IF v_streak_record.last_play_date = v_today_ist - 1 THEN
                v_streak_intact := true;
            ELSIF v_streak_record.last_play_date = v_today_ist - 2 AND v_freezes > 0 THEN
                v_streak_intact := true; -- Freeze available to protect streak
            ELSE
                v_streak := 0; -- Streak lapsed
                v_streak_intact := false;
            END IF;
        ELSE
            v_streak_intact := true;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'current_streak', v_streak,
        'highest_streak', v_highest,
        'played_today', v_played_today,
        'cooldown_active', v_cooldown_active,
        'cooldown_seconds_remaining', v_cooldown_seconds_remaining,
        'unlocks_at', v_unlocks_at,
        'last_completed_at', v_last_completed_at,
        'streak_intact', v_streak_intact,
        'freezes_left', v_freezes,
        'challenge_date_ist', v_today_ist
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_quiz_streak(UUID) TO authenticated, service_role;

-- ── 4. UPDATE submit_daily_challenge WITH 6-HOUR COOLDOWN ENFORCEMENT ──────────
CREATE OR REPLACE FUNCTION public.submit_daily_challenge(
    p_category_id UUID,
    p_score INTEGER,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_today_ist DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_current_month INTEGER := EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'))::integer;
    v_base_reward_paise BIGINT := 2500;
    v_milestone_bonus_paise BIGINT := 0;
    v_total_reward_paise BIGINT := 2500;
    v_user_role TEXT;
    v_merchant_id UUID;
    v_new_balance_paise BIGINT := 0;
    v_play_id UUID;
    v_streak_rec RECORD;
    v_new_streak INTEGER := 1;
    v_highest_streak INTEGER := 1;
    v_freezes_left INTEGER := 1;
    v_freeze_used BOOLEAN := false;
    v_max_freezes INTEGER := 1;
    v_streak_config JSONB;
    v_milestone JSONB;
    v_badge TEXT := NULL;
    v_cust_wallet_id UUID;
    v_cust_bal_before BIGINT := 0;
    v_valid_category_id UUID := NULL;
    v_last_completed_at TIMESTAMPTZ := NULL;
    v_seconds_remaining INTEGER := 0;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Fetch user profile & role
    SELECT role INTO v_user_role
    FROM public.user_profiles WHERE id = v_user_id;

    -- Check if merchant
    IF v_user_role = 'merchant' THEN
        SELECT id INTO v_merchant_id
        FROM public.merchants WHERE user_id = v_user_id;
    END IF;

    -- Validate Category ID to avoid Foreign Key Violations
    IF p_category_id IS NOT NULL THEN
        SELECT id INTO v_valid_category_id
        FROM public.daily_challenge_categories
        WHERE id = p_category_id;
    END IF;

    -- Enforce 6-Hour Cooldown between challenge plays
    SELECT completed_at INTO v_last_completed_at
    FROM public.daily_challenge_plays 
    WHERE user_id = v_user_id 
    ORDER BY completed_at DESC 
    LIMIT 1;

    IF v_last_completed_at IS NOT NULL AND v_last_completed_at + INTERVAL '6 hours' > now() THEN
        v_seconds_remaining := GREATEST(0, EXTRACT(EPOCH FROM ((v_last_completed_at + INTERVAL '6 hours') - now()))::INTEGER);
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Challenge cooldown active. You can play every 6 hours. Next challenge unlocks in ' || 
                       LPAD((v_seconds_remaining / 3600)::TEXT, 2, '0') || 'h ' || 
                       LPAD(((v_seconds_remaining % 3600) / 60)::TEXT, 2, '0') || 'm ' || 
                       LPAD((v_seconds_remaining % 60)::TEXT, 2, '0') || 's.',
            'cooldown_active', true,
            'cooldown_seconds_remaining', v_seconds_remaining,
            'unlocks_at', v_last_completed_at + INTERVAL '6 hours'
        );
    END IF;

    -- Dynamic Base Reward from settings
    SELECT (value->>'daily_challenge_reward_paise')::BIGINT INTO v_base_reward_paise
    FROM public.marketing_settings WHERE key = 'rewards_config';
    v_base_reward_paise := COALESCE(v_base_reward_paise, 2500);

    -- Fetch dynamic streak configuration
    SELECT value INTO v_streak_config
    FROM public.marketing_settings WHERE key = 'streak_config';

    v_max_freezes := COALESCE(
        (v_streak_config->>'monthly_freezes_allowed')::integer,
        (v_streak_config->>'monthly_freeze_allowance')::integer,
        1
    );

    -- ── 1. CALCULATE STREAK ATOMICALLY IN IST ──
    SELECT * INTO v_streak_rec FROM public.user_quiz_streaks WHERE user_id = v_user_id;

    IF v_streak_rec.user_id IS NULL THEN
        -- First time player
        v_new_streak := 1;
        v_highest_streak := 1;
        v_freezes_left := v_max_freezes;

        INSERT INTO public.user_quiz_streaks (
            user_id, current_streak, highest_streak, last_play_date, streak_freezes_left, freeze_reset_month
        ) VALUES (
            v_user_id, 1, 1, v_today_ist, v_max_freezes, v_current_month
        );
    ELSE
        v_freezes_left := v_streak_rec.streak_freezes_left;

        -- Monthly reset of freezes
        IF v_streak_rec.freeze_reset_month != v_current_month THEN
            v_freezes_left := v_max_freezes;
        END IF;

        IF v_streak_rec.last_play_date = v_today_ist THEN
            -- Already played earlier today (6 hours ago) -> Keep streak intact
            v_new_streak := GREATEST(1, v_streak_rec.current_streak);
        ELSIF v_streak_rec.last_play_date = v_today_ist - 1 THEN
            -- Consecutive day play in IST
            v_new_streak := v_streak_rec.current_streak + 1;
        ELSIF v_streak_rec.last_play_date = v_today_ist - 2 AND v_freezes_left > 0 THEN
            -- Missed 1 day, protect with streak freeze!
            v_new_streak := v_streak_rec.current_streak + 1;
            v_freezes_left := v_freezes_left - 1;
            v_freeze_used := true;
        ELSE
            -- Streak lapsed
            v_new_streak := 1;
        END IF;

        v_highest_streak := GREATEST(v_streak_rec.highest_streak, v_new_streak);

        UPDATE public.user_quiz_streaks
        SET current_streak = v_new_streak,
            highest_streak = v_highest_streak,
            last_play_date = v_today_ist,
            streak_freezes_left = v_freezes_left,
            freeze_reset_month = v_current_month,
            updated_at = now()
        WHERE user_id = v_user_id;
    END IF;

    -- ── 2. EVALUATE DYNAMIC STREAK MILESTONES ──
    IF v_streak_config IS NOT NULL AND v_streak_config->'milestones' IS NOT NULL THEN
        FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_streak_config->'milestones')
        LOOP
            IF (v_milestone->>'active')::boolean IS TRUE AND (v_milestone->>'days')::integer = v_new_streak THEN
                v_milestone_bonus_paise := COALESCE((v_milestone->>'bonus_paise')::bigint, 0);
                v_badge := v_milestone->>'badge';
            END IF;
        END LOOP;
    END IF;

    v_total_reward_paise := v_base_reward_paise + v_milestone_bonus_paise;

    -- ── 3. RECORD CHALLENGE PLAY (6-Hour Interval) ──
    INSERT INTO public.daily_challenge_plays (
        user_id, challenge_date, category_id, score, cashback_awarded_paise, completed_at
    ) VALUES (
        v_user_id, v_today_ist, v_valid_category_id, p_score, v_total_reward_paise, now()
    ) RETURNING id INTO v_play_id;

    -- ── 4. ROUTE CREDIT ACCORDING TO ROLE ──
    IF v_user_role = 'merchant' AND v_merchant_id IS NOT NULL THEN
        PERFORM set_config('app.internal_bypass', 'true', true);

        UPDATE public.merchants 
        SET wallet_balance_paise = wallet_balance_paise + v_total_reward_paise 
        WHERE id = v_merchant_id
        RETURNING wallet_balance_paise INTO v_new_balance_paise;

        PERFORM set_config('app.internal_bypass', 'false', true);

        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_merchant_id, 'daily_challenge_reward', v_total_reward_paise, v_new_balance_paise,
            'Daily Challenge reward' || CASE WHEN v_milestone_bonus_paise > 0 THEN ' + ' || v_new_streak || '-Day streak milestone bonus' ELSE '' END,
            jsonb_build_object(
                'play_id', v_play_id,
                'streak', v_new_streak,
                'milestone_bonus_paise', v_milestone_bonus_paise,
                'badge', v_badge,
                'freeze_used', v_freeze_used,
                'challenge_date_ist', v_today_ist
            )
        );
    ELSE
        INSERT INTO public.customer_wallets (user_id, balance_paise)
        VALUES (v_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT id, balance_paise INTO v_cust_wallet_id, v_cust_bal_before
        FROM public.customer_wallets 
        WHERE user_id = v_user_id;

        v_new_balance_paise := v_cust_bal_before + v_total_reward_paise;

        UPDATE public.customer_wallets 
        SET balance_paise = v_new_balance_paise, updated_at = now()
        WHERE id = v_cust_wallet_id;

        INSERT INTO public.customer_wallet_transactions (
            wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description, reference_id, reference_type
        ) VALUES (
            v_cust_wallet_id, v_user_id, 'CREDIT', v_total_reward_paise, v_cust_bal_before, v_new_balance_paise,
            'Daily Challenge reward' || CASE WHEN v_milestone_bonus_paise > 0 THEN ' + ' || v_new_streak || '-Day streak milestone bonus' ELSE '' END,
            v_play_id, 'daily_challenge'
        );
    END IF;

    -- ── 5. UPDATE STREAK MARKETING TARGET MILESTONES ──
    UPDATE public.marketing_target_claims
    SET current_progress = v_new_streak,
        is_completed = CASE WHEN v_new_streak >= target_value THEN true ELSE is_completed END,
        completed_at = CASE WHEN v_new_streak >= target_value AND completed_at IS NULL THEN now() ELSE completed_at END
    FROM public.marketing_targets
    WHERE public.marketing_target_claims.target_id = public.marketing_targets.id
      AND public.marketing_target_claims.user_id = v_user_id
      AND public.marketing_targets.type = 'STREAK';

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Daily challenge completed successfully! Next challenge unlocks in 6 hours.',
        'reward_paise', v_total_reward_paise,
        'base_reward_paise', v_base_reward_paise,
        'milestone_bonus_paise', v_milestone_bonus_paise,
        'current_streak', v_new_streak,
        'highest_streak', v_highest_streak,
        'badge', v_badge,
        'milestone_badge', v_badge,
        'freeze_used', v_freeze_used,
        'freezes_left', v_freezes_left,
        'new_balance_paise', v_new_balance_paise,
        'challenge_date_ist', v_today_ist,
        'next_unlock_seconds', 21600,
        'unlocks_at', now() + INTERVAL '6 hours'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_daily_challenge(UUID, INTEGER, UUID) TO authenticated, service_role;
