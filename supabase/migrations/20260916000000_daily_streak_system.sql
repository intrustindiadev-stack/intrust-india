-- ==============================================================================
-- INTRUST MARKETING WORKSPACE — DYNAMIC DAILY STREAK SYSTEM V1
-- ==============================================================================

-- 1. USER QUIZ STREAKS TABLE
CREATE TABLE IF NOT EXISTS public.user_quiz_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 1,
    highest_streak INTEGER NOT NULL DEFAULT 1,
    last_play_date DATE NOT NULL DEFAULT CURRENT_DATE,
    streak_freezes_left INTEGER NOT NULL DEFAULT 1,
    freeze_reset_month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::integer,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_quiz_streaks_current ON public.user_quiz_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_quiz_streaks_user ON public.user_quiz_streaks(user_id);

-- Ensure marketing_target_claims has progress columns for streak updates
ALTER TABLE public.marketing_target_claims
ADD COLUMN IF NOT EXISTS current_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.user_quiz_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own streak" ON public.user_quiz_streaks;
CREATE POLICY "Users can read own streak" ON public.user_quiz_streaks
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to streaks" ON public.user_quiz_streaks;
CREATE POLICY "Admins have full access to streaks" ON public.user_quiz_streaks
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

-- 2. SEED DYNAMIC STREAK CONFIGURATION IN MARKETING_SETTINGS
INSERT INTO public.marketing_settings (key, value) VALUES 
('streak_config', '{
    "monthly_freezes_allowed": 1,
    "monthly_freeze_allowance": 1,
    "milestones": [
        { "days": 3, "bonus_paise": 1000, "badge": "3-Day Flame", "active": true },
        { "days": 7, "bonus_paise": 3000, "badge": "Weekly Master", "active": true },
        { "days": 14, "bonus_paise": 7500, "badge": "Bi-Weekly Champion", "active": true },
        { "days": 30, "bonus_paise": 20000, "badge": "InTrust Legend", "active": true }
    ]
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. RPC: get_user_quiz_streak (Retrieve live streak info for authenticated user)
CREATE OR REPLACE FUNCTION public.get_user_quiz_streak()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_streak_record RECORD;
    v_played_today BOOLEAN := false;
    v_streak_intact BOOLEAN := false;
    v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
    v_max_freezes INTEGER := 1;
    v_freezes INTEGER := 1;
    v_streak INTEGER := 0;
    v_highest INTEGER := 0;
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

    -- Check if played today
    SELECT EXISTS (
        SELECT 1 FROM public.daily_challenge_plays
        WHERE user_id = v_user_id AND challenge_date = CURRENT_DATE
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

        -- If haven't played today, verify if yesterday was played (streak intact)
        IF NOT v_played_today THEN
            IF v_streak_record.last_play_date = CURRENT_DATE - 1 THEN
                v_streak_intact := true;
            ELSIF v_streak_record.last_play_date = CURRENT_DATE - 2 AND v_freezes > 0 THEN
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
        'streak_intact', v_streak_intact,
        'freezes_left', v_freezes
    );
END;
$$;

-- 4. ENHANCED RPC: submit_daily_challenge (Atomic Streak & Dynamic Milestones)
CREATE OR REPLACE FUNCTION public.submit_daily_challenge(
    p_category_id UUID,
    p_score INTEGER
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_base_reward_paise BIGINT := 2500;
    v_milestone_bonus_paise BIGINT := 0;
    v_total_reward_paise BIGINT := 2500;
    v_user_role TEXT;
    v_merchant_id UUID;
    v_new_balance_paise BIGINT := 0;
    v_cust_wallet_id UUID;
    v_cust_bal_before BIGINT := 0;
    v_play_id UUID;

    -- Streak variables
    v_streak_rec RECORD;
    v_new_streak INTEGER := 1;
    v_highest_streak INTEGER := 1;
    v_freeze_used BOOLEAN := false;
    v_max_freezes INTEGER := 1;
    v_freezes_left INTEGER := 1;
    v_current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
    v_badge TEXT := NULL;
    v_streak_config JSONB;
    v_milestone JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Check if already completed today
    IF EXISTS (SELECT 1 FROM public.daily_challenge_plays WHERE user_id = v_user_id AND challenge_date = CURRENT_DATE) THEN
        RETURN jsonb_build_object('success', false, 'message', 'You have already completed today''s challenge');
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

    -- ── 1. CALCULATE STREAK ATOMICALLY ──
    SELECT * INTO v_streak_rec FROM public.user_quiz_streaks WHERE user_id = v_user_id;

    IF v_streak_rec.user_id IS NULL THEN
        -- First time player
        v_new_streak := 1;
        v_highest_streak := 1;
        v_freezes_left := v_max_freezes;

        INSERT INTO public.user_quiz_streaks (
            user_id, current_streak, highest_streak, last_play_date, streak_freezes_left, freeze_reset_month
        ) VALUES (
            v_user_id, 1, 1, CURRENT_DATE, v_max_freezes, v_current_month
        );
    ELSE
        v_freezes_left := v_streak_rec.streak_freezes_left;

        -- Monthly reset of freezes
        IF v_streak_rec.freeze_reset_month != v_current_month THEN
            v_freezes_left := v_max_freezes;
        END IF;

        IF v_streak_rec.last_play_date = CURRENT_DATE - 1 THEN
            -- Consecutive day play
            v_new_streak := v_streak_rec.current_streak + 1;
        ELSIF v_streak_rec.last_play_date = CURRENT_DATE - 2 AND v_freezes_left > 0 THEN
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
            last_play_date = CURRENT_DATE,
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

    -- ── 3. RECORD CHALLENGE PLAY ──
    INSERT INTO public.daily_challenge_plays (
        user_id, challenge_date, category_id, score, cashback_awarded_paise
    ) VALUES (
        v_user_id, CURRENT_DATE, p_category_id, p_score, v_total_reward_paise
    ) RETURNING id INTO v_play_id;

    -- ── 4. ROUTE CREDIT ACCORDING TO ROLE ──
    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = v_user_id;

    IF v_user_role = 'merchant' THEN
        SELECT id, wallet_balance_paise INTO v_merchant_id, v_cust_bal_before 
        FROM public.merchants 
        WHERE user_id = v_user_id;

        IF v_merchant_id IS NOT NULL THEN
            UPDATE public.merchants 
            SET wallet_balance_paise = wallet_balance_paise + v_total_reward_paise 
            WHERE id = v_merchant_id
            RETURNING wallet_balance_paise INTO v_new_balance_paise;

            INSERT INTO public.merchant_transactions (
                merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
            ) VALUES (
                v_merchant_id, 'daily_challenge_cashback', v_total_reward_paise, v_new_balance_paise,
                'Daily Challenge Cashback (' || v_new_streak || '-Day Streak)',
                jsonb_build_object(
                    'play_id', v_play_id,
                    'score', p_score,
                    'streak', v_new_streak,
                    'base_reward_paise', v_base_reward_paise,
                    'milestone_bonus_paise', v_milestone_bonus_paise
                )
            );
        END IF;
    ELSE
        -- Ensure Customer Wallet exists
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
            'Daily Challenge Reward (' || v_new_streak || '-Day Streak)', v_play_id::text, 'DAILY_CHALLENGE'
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
      AND public.marketing_targets.metric_type = 'quiz_streak';

    -- ── 6. SEND ROLE-AWARE NOTIFICATION ──
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_id, reference_type
    ) VALUES (
        v_user_id,
        CASE WHEN v_milestone_bonus_paise > 0 
             THEN '🔥 ' || v_new_streak || '-Day Streak Milestone Bonus!' 
             ELSE 'Cashback Received! 💰' 
        END,
        'Earned ₹' || (v_total_reward_paise / 100)::text || 
        CASE WHEN v_milestone_bonus_paise > 0 
             THEN ' (including ₹' || (v_milestone_bonus_paise / 100)::text || ' streak bonus) for day ' || v_new_streak::text || '.' 
             ELSE ' for completing today''s challenge.' 
        END,
        'success',
        v_play_id,
        'daily_challenge'
    );

    RETURN jsonb_build_object(
        'success', true,
        'reward_paise', v_total_reward_paise,
        'base_reward_paise', v_base_reward_paise,
        'milestone_bonus_paise', v_milestone_bonus_paise,
        'current_streak', v_new_streak,
        'highest_streak', v_highest_streak,
        'freeze_used', v_freeze_used,
        'badge', v_badge,
        'new_balance_paise', v_new_balance_paise
    );
END;
$$;
