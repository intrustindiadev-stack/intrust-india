-- ==============================================================================
-- Migration: 20260922000000_marketing_ist_midnight_rollover.sql
-- Description:
--   1. Replaces CURRENT_DATE with Indian Standard Time (Asia/Kolkata) date in:
--      - submit_daily_challenge
--      - get_user_quiz_streak
--      - book_daily_challenge_sponsorship
--   2. Supports p_user_id UUID DEFAULT NULL in get_user_quiz_streak for server & service_role calls.
--   3. Enforces atomic once-per-day play per IST calendar date.
-- ==============================================================================

-- Drop existing functions to allow signature update
DROP FUNCTION IF EXISTS public.get_user_quiz_streak();
DROP FUNCTION IF EXISTS public.get_user_quiz_streak(UUID);

-- 1. ENHANCED get_user_quiz_streak WITH IST DATE AND OPTIONAL p_user_id
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
        'streak_intact', v_streak_intact,
        'freezes_left', v_freezes,
        'challenge_date_ist', v_today_ist
    );
END;
$$;

-- 2. ENHANCED submit_daily_challenge WITH STRICT IST MIDNIGHT ROLLOVER
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
    v_kyc_status TEXT;
    v_sub_status TEXT;
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
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Fetch user profile & eligibility
    SELECT role, kyc_status INTO v_user_role, v_kyc_status
    FROM public.user_profiles WHERE id = v_user_id;

    IF v_user_role = 'merchant' THEN
        SELECT id, subscription_status INTO v_merchant_id, v_sub_status
        FROM public.merchants WHERE user_id = v_user_id;

        IF v_sub_status != 'active' THEN
            RETURN jsonb_build_object('success', false, 'message', 'An active merchant subscription is required to participate in daily challenges');
        END IF;
    ELSE
        IF v_kyc_status != 'verified' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Identity verification (KYC) is required to participate in daily challenges and claim cashbacks');
        END IF;
    END IF;

    -- Check if already completed today in IST (Once per day enforcement)
    IF EXISTS (
        SELECT 1 FROM public.daily_challenge_plays 
        WHERE user_id = v_user_id AND challenge_date = v_today_ist
    ) THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'You have already completed today''s challenge. Next challenge unlocks at 12:00 AM IST midnight.'
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

        IF v_streak_rec.last_play_date = v_today_ist - 1 THEN
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

    -- ── 3. RECORD CHALLENGE PLAY ──
    INSERT INTO public.daily_challenge_plays (
        user_id, challenge_date, category_id, score, cashback_awarded_paise
    ) VALUES (
        v_user_id, v_today_ist, p_category_id, p_score, v_total_reward_paise
    ) RETURNING id INTO v_play_id;

    -- ── 4. ROUTE CREDIT ACCORDING TO ROLE ──
    IF v_user_role = 'merchant' THEN
        IF v_merchant_id IS NOT NULL THEN
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
                'Daily Challenge quiz reward' || CASE WHEN v_milestone_bonus_paise > 0 THEN ' + ' || v_new_streak || '-Day streak milestone bonus' ELSE '' END,
                jsonb_build_object(
                    'play_id', v_play_id,
                    'streak', v_new_streak,
                    'milestone_bonus_paise', v_milestone_bonus_paise,
                    'badge', v_badge,
                    'freeze_used', v_freeze_used,
                    'challenge_date_ist', v_today_ist
                )
            );
        END IF;
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
            'Daily Challenge quiz reward' || CASE WHEN v_milestone_bonus_paise > 0 THEN ' + ' || v_new_streak || '-Day streak milestone bonus' ELSE '' END,
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
        'new_balance_paise', v_new_balance_paise,
        'challenge_date_ist', v_today_ist
    );
EXCEPTION
    WHEN OTHERS THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. ENHANCED book_daily_challenge_sponsorship WITH IST CHECK & UNIFIED WALLET
CREATE OR REPLACE FUNCTION public.book_daily_challenge_sponsorship(
    p_sponsor_date DATE,
    p_products JSONB,
    p_campaign_message TEXT,
    p_payment_method TEXT,
    p_payment_ref TEXT DEFAULT NULL,
    p_merchant_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_merchant_id UUID := p_merchant_id;
    v_today_ist DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_sponsor_fee_paise BIGINT;
    v_total_deduction_paise BIGINT;
    v_merchant_balance_paise BIGINT := 0;
    v_cust_balance_paise BIGINT := 0;
    v_cust_wallet_id UUID := NULL;
    v_wallet_source TEXT := 'merchant';
    v_new_balance_paise BIGINT;
    v_booking_id UUID;
    v_store_name TEXT;
    v_business_name TEXT;
    v_existing_booking UUID;
    v_clean_products JSONB := '[]'::jsonb;
    v_item JSONB;
    v_invoice_num TEXT;
BEGIN
    -- 1. Resolve merchant identity
    IF v_merchant_id IS NOT NULL THEN
        SELECT store_name, business_name, COALESCE(wallet_balance_paise, 0)
        INTO v_store_name, v_business_name, v_merchant_balance_paise
        FROM public.merchants WHERE id = v_merchant_id;
    ELSIF v_user_id IS NOT NULL THEN
        SELECT id, store_name, business_name, COALESCE(wallet_balance_paise, 0)
        INTO v_merchant_id, v_store_name, v_business_name, v_merchant_balance_paise
        FROM public.merchants WHERE user_id = v_user_id LIMIT 1;
    END IF;

    -- If no direct merchant found, fallback to first available merchant
    IF v_merchant_id IS NULL AND v_user_id IS NOT NULL THEN
        SELECT id, store_name, business_name, COALESCE(wallet_balance_paise, 0)
        INTO v_merchant_id, v_store_name, v_business_name, v_merchant_balance_paise
        FROM public.merchants LIMIT 1;
    END IF;

    IF v_merchant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Merchant profile not found or unauthorized');
    END IF;

    -- 2. Check Customer Wallet balance for this user
    IF v_user_id IS NOT NULL THEN
        SELECT id, COALESCE(balance_paise, 0)
        INTO v_cust_wallet_id, v_cust_balance_paise
        FROM public.customer_wallets WHERE user_id = v_user_id;
    END IF;

    -- Sponsorship must be booked for future IST dates
    IF p_sponsor_date <= v_today_ist THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sponsorship bookings must be made for future dates (after today ' || v_today_ist::text || ' IST)');
    END IF;

    -- Check if date is already booked
    SELECT id INTO v_existing_booking 
    FROM public.daily_challenge_sponsorships
    WHERE sponsor_date = p_sponsor_date AND status = 'confirmed';

    IF v_existing_booking IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'This date is already sponsored. Please choose another date.');
    END IF;

    -- Dynamic Sponsorship Fee from settings
    SELECT (value->>'sponsorship_fee_paise')::BIGINT INTO v_sponsor_fee_paise
    FROM public.marketing_settings WHERE key = 'rewards_config';
    v_sponsor_fee_paise := COALESCE(v_sponsor_fee_paise, 99900);
    v_total_deduction_paise := v_sponsor_fee_paise + ROUND(v_sponsor_fee_paise * 0.18); -- 18% GST

    -- Format products array
    IF jsonb_typeof(p_products) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_products)
        LOOP
            v_clean_products := v_clean_products || jsonb_build_object(
                'id', v_item->>'id',
                'product_name', COALESCE(v_item->>'product_name', v_item->>'name', v_item->>'title'),
                'price', COALESCE((v_item->>'price')::numeric, ((v_item->>'selling_price_paise')::numeric / 100), 0),
                'image_url', COALESCE(v_item->>'image_url', v_item->>'image', '/icons/intrustLogo.png'),
                'slug', v_item->>'slug'
            );
        END LOOP;
    END IF;

    -- Handle Wallet Payment from either merchant or customer wallet
    IF p_payment_method = 'wallet' THEN
        IF v_merchant_balance_paise >= v_total_deduction_paise THEN
            v_wallet_source := 'merchant';
        ELSIF v_cust_balance_paise >= v_total_deduction_paise THEN
            v_wallet_source := 'customer';
        ELSIF v_merchant_balance_paise >= v_sponsor_fee_paise THEN
            v_wallet_source := 'merchant';
            v_total_deduction_paise := v_sponsor_fee_paise;
        ELSIF v_cust_balance_paise >= v_sponsor_fee_paise THEN
            v_wallet_source := 'customer';
            v_total_deduction_paise := v_sponsor_fee_paise;
        ELSE
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Insufficient wallet balance (Available: ₹' || (GREATEST(v_merchant_balance_paise, v_cust_balance_paise) / 100)::text || '). Please choose SabPaisa Gateway or top up your wallet.'
            );
        END IF;

        IF v_wallet_source = 'merchant' THEN
            v_new_balance_paise := v_merchant_balance_paise - v_total_deduction_paise;
            PERFORM set_config('app.internal_bypass', 'true', true);
            UPDATE public.merchants SET wallet_balance_paise = v_new_balance_paise WHERE id = v_merchant_id;
            PERFORM set_config('app.internal_bypass', 'false', true);

            INSERT INTO public.merchant_transactions (
                merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
            ) VALUES (
                v_merchant_id, 'sponsorship_fee', -v_total_deduction_paise, v_new_balance_paise,
                'Daily Challenge Sponsorship booking for ' || p_sponsor_date::text,
                jsonb_build_object('sponsor_date', p_sponsor_date, 'payment_method', 'wallet', 'source', 'merchant_wallet')
            );
        ELSE
            v_new_balance_paise := v_cust_balance_paise - v_total_deduction_paise;
            UPDATE public.customer_wallets SET balance_paise = v_new_balance_paise, updated_at = now() WHERE id = v_cust_wallet_id;

            INSERT INTO public.customer_wallet_transactions (
                wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description, reference_type
            ) VALUES (
                v_cust_wallet_id, v_user_id, 'DEBIT', v_total_deduction_paise, v_cust_balance_paise, v_new_balance_paise,
                'Daily Challenge Sponsorship booking for ' || p_sponsor_date::text, 'sponsorship'
            );
        END IF;
    END IF;

    -- Create Confirmed Sponsorship Record
    INSERT INTO public.daily_challenge_sponsorships (
        merchant_id, sponsor_date, products, campaign_message, fee_paid_paise,
        payment_method, payment_status, status
    ) VALUES (
        v_merchant_id, p_sponsor_date, v_clean_products, p_campaign_message,
        v_sponsor_fee_paise, p_payment_method, 'completed', 'confirmed'
    ) RETURNING id INTO v_booking_id;

    -- Generate Compliant GST B2B Invoice
    v_invoice_num := 'INV-SPONSOR-' || TO_CHAR(now(), 'YYYYMMDD') || '-' || SUBSTRING(v_booking_id::text, 1, 6);
    
    INSERT INTO public.tax_invoices (
        invoice_number, merchant_id, invoice_type, billing_period_start, billing_period_end,
        subtotal_paise, cgst_paise, sgst_paise, igst_paise, total_tax_paise, total_amount_paise,
        status, line_items, metadata
    ) VALUES (
        v_invoice_num, v_merchant_id, 'COMMISSION', p_sponsor_date, p_sponsor_date,
        ROUND(v_sponsor_fee_paise / 1.18),
        ROUND((v_sponsor_fee_paise - ROUND(v_sponsor_fee_paise / 1.18)) / 2),
        ROUND((v_sponsor_fee_paise - ROUND(v_sponsor_fee_paise / 1.18)) / 2),
        0,
        v_sponsor_fee_paise - ROUND(v_sponsor_fee_paise / 1.18),
        v_sponsor_fee_paise,
        'ISSUED',
        jsonb_build_array(jsonb_build_object(
            'description', 'Daily Challenge Sponsorship Billboard Fee (' || p_sponsor_date::text || ')',
            'sac_code', '998314',
            'amount_paise', v_sponsor_fee_paise,
            'gst_rate', 18
        )),
        jsonb_build_object('sponsorship_id', v_booking_id, 'sponsor_date', p_sponsor_date)
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'sponsor_date', p_sponsor_date,
        'fee_paid_paise', v_sponsor_fee_paise,
        'invoice_number', v_invoice_num
    );
EXCEPTION
    WHEN OTHERS THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. GRANTS
GRANT EXECUTE ON FUNCTION public.get_user_quiz_streak(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_daily_challenge(UUID, INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.book_daily_challenge_sponsorship(DATE, JSONB, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
