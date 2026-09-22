-- ============================================================================
-- Migration: Marketing Engine Production Hardening & Full Attribution Suite
-- Created: 2026-09-19
-- Description:
--   1. Expands marketing_targets_metric_type_check to include:
--      'share_links', 'quiz_streak', 'store_sales', 'referrals', 'link_clicks',
--      'user_registration', 'daily_login', 'first_order', 'custom'.
--   2. Ensures merchant_transactions_transaction_type_check accepts:
--      'sponsorship', 'daily_challenge_cashback', and 'marketing_cashback'.
--   3. Hardens book_daily_challenge_sponsorship with app.internal_bypass='true',
--      verifying approved merchant status and active subscription.
--   4. Hardens claim_marketing_target_reward with app.internal_bypass='true',
--      enforcing KYC verification for customers and active subscription for merchants.
--   5. Hardens submit_daily_challenge with app.internal_bypass='true',
--      enforcing KYC verification for customers and active subscription for merchants.
--   6. Hardens process_marketing_referral_reward with app.internal_bypass='true'.
--   7. Creates process_marketing_conversion_reward alias.
-- ============================================================================

-- 1. UPDATE MARKETING TARGETS METRIC TYPE CHECK CONSTRAINT
ALTER TABLE public.marketing_targets 
    DROP CONSTRAINT IF EXISTS marketing_targets_metric_type_check;

ALTER TABLE public.marketing_targets 
    ADD CONSTRAINT marketing_targets_metric_type_check 
    CHECK (metric_type IN (
        'share_links', 
        'quiz_streak', 
        'store_sales', 
        'referrals', 
        'link_clicks', 
        'user_registration', 
        'daily_login', 
        'first_order', 
        'custom'
    ));

-- 2. ENSURE MERCHANT TRANSACTIONS CHECK CONSTRAINT ACCEPTS ALL MARKETING TYPES
DO $$
BEGIN
    ALTER TABLE public.merchant_transactions
        DROP CONSTRAINT IF EXISTS merchant_transactions_transaction_type_check;

    ALTER TABLE public.merchant_transactions
        ADD CONSTRAINT merchant_transactions_transaction_type_check
        CHECK (transaction_type = ANY (ARRAY[
            'purchase', 'sale', 'commission', 'wallet_topup', 'withdrawal',
            'udhari_payment', 'store_credit_payment', 'subscription', 'payout',
            'referral_reward', 'sale_earnings', 'sponsorship', 'daily_challenge_cashback', 'marketing_cashback'
        ]::text[]));
END $$;

-- 3. HARDENED ATOMIC RPC: book_daily_challenge_sponsorship
CREATE OR REPLACE FUNCTION public.book_daily_challenge_sponsorship(
    p_sponsor_date DATE,
    p_product_ids JSONB,
    p_campaign_message TEXT,
    p_payment_method TEXT DEFAULT 'wallet',
    p_client_txn_id TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_merchant_id UUID;
    v_merchant_name TEXT;
    v_merchant_balance BIGINT;
    v_merchant_status TEXT;
    v_sub_status TEXT;
    v_sub_expires TIMESTAMPTZ;
    v_new_balance BIGINT;
    v_fee_paise BIGINT;
    v_booking_id UUID;
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    SELECT id, business_name, wallet_balance_paise, status, subscription_status, subscription_expires_at
    INTO v_merchant_id, v_merchant_name, v_merchant_balance, v_merchant_status, v_sub_status, v_sub_expires
    FROM public.merchants WHERE user_id = v_user_id;
    
    IF v_merchant_id IS NULL OR v_merchant_status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only verified and approved merchants can sponsor challenges');
    END IF;

    IF v_sub_status != 'active' OR (v_sub_expires IS NOT NULL AND v_sub_expires < now()) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An active merchant subscription is required to sponsor daily challenges');
    END IF;

    -- Dynamic fee from marketing_settings
    SELECT (value->>'sponsorship_fee_paise')::BIGINT INTO v_fee_paise
    FROM public.marketing_settings WHERE key = 'rewards_config';
    v_fee_paise := COALESCE(v_fee_paise, 99900);

    IF p_sponsor_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sponsorship dates must be in the future');
    END IF;

    IF p_payment_method = 'wallet' AND v_merchant_balance < v_fee_paise THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Insufficient wallet balance (₹' || (v_merchant_balance/100)::text || '). Fee is ₹' || (v_fee_paise/100)::text
        );
    END IF;

    -- Lock date (enforced by UNIQUE constraint on sponsor_date)
    INSERT INTO public.daily_challenge_sponsorships (
        sponsor_date, merchant_id, product_ids, campaign_message, fee_paise, status
    ) VALUES (
        p_sponsor_date, v_merchant_id, p_product_ids, p_campaign_message, v_fee_paise, 'booked'
    ) RETURNING id INTO v_booking_id;

    IF p_payment_method = 'wallet' THEN
        -- Allow internal bypass for sensitive column trigger
        PERFORM set_config('app.internal_bypass', 'true', true);

        -- Deduct fee from merchant wallet atomically
        UPDATE public.merchants 
        SET wallet_balance_paise = wallet_balance_paise - v_fee_paise
        WHERE id = v_merchant_id
        RETURNING wallet_balance_paise INTO v_new_balance;

        -- Reset internal bypass
        PERFORM set_config('app.internal_bypass', 'false', true);

        -- Record transaction with correct schema
        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_merchant_id, 'sponsorship', v_fee_paise, v_new_balance, 
            'Daily Challenge Sponsorship for ' || to_char(p_sponsor_date, 'DD Mon YYYY'),
            jsonb_build_object('booking_id', v_booking_id, 'sponsor_date', p_sponsor_date, 'payment_method', 'wallet')
        );
    ELSE
        -- SabPaisa / External Gateway settlement
        v_new_balance := v_merchant_balance;
        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_merchant_id, 'sponsorship', v_fee_paise, v_new_balance, 
            'Daily Challenge Sponsorship (SabPaisa Gateway) for ' || to_char(p_sponsor_date, 'DD Mon YYYY'),
            jsonb_build_object('booking_id', v_booking_id, 'sponsor_date', p_sponsor_date, 'payment_method', 'sabpaisa', 'client_txn_id', p_client_txn_id)
        );
    END IF;

    -- Trigger in-app notification
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_id, reference_type
    ) VALUES (
        v_user_id,
        'Sponsorship Confirmed! 🎉',
        'Your featured daily challenge sponsorship for ' || to_char(p_sponsor_date, 'DD Mon YYYY') || ' has been locked in.',
        'info',
        v_booking_id,
        'sponsorship'
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'fee_paid_paise', v_fee_paise,
        'new_balance_paise', v_new_balance,
        'sponsor_date', p_sponsor_date,
        'merchant_name', v_merchant_name
    );
EXCEPTION
    WHEN OTHERS THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. HARDENED ATOMIC RPC: claim_marketing_target_reward
CREATE OR REPLACE FUNCTION public.claim_marketing_target_reward(
    p_target_id UUID,
    p_recipient_name TEXT DEFAULT NULL,
    p_recipient_phone TEXT DEFAULT NULL,
    p_shipping_address TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_user_role TEXT;
    v_kyc_status TEXT;
    v_target RECORD;
    v_existing_claim RECORD;
    v_merchant_id UUID;
    v_merchant_status TEXT;
    v_sub_status TEXT;
    v_sub_expires TIMESTAMPTZ;
    v_cust_wallet_id UUID;
    v_bal_before BIGINT;
    v_new_balance BIGINT;
    v_claim_id UUID;
    v_status TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Identify role and verification
    SELECT role, kyc_status INTO v_user_role, v_kyc_status FROM public.user_profiles WHERE id = v_user_id;

    IF v_user_role = 'merchant' THEN
        SELECT id, wallet_balance_paise, status, subscription_status, subscription_expires_at 
        INTO v_merchant_id, v_bal_before, v_merchant_status, v_sub_status, v_sub_expires
        FROM public.merchants WHERE user_id = v_user_id;

        IF v_merchant_id IS NULL OR v_merchant_status != 'approved' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Only approved merchants can claim merchant targets');
        END IF;

        IF v_sub_status != 'active' OR (v_sub_expires IS NOT NULL AND v_sub_expires < now()) THEN
            RETURN jsonb_build_object('success', false, 'message', 'An active merchant subscription is required to claim marketing rewards');
        END IF;
    ELSE
        IF v_kyc_status != 'verified' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Identity verification (KYC) is required to claim marketing milestone rewards');
        END IF;
    END IF;

    -- Fetch target
    SELECT * INTO v_target 
    FROM public.marketing_targets 
    WHERE id = p_target_id AND is_active = true;

    IF v_target.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target not found or inactive');
    END IF;

    -- Check if already claimed
    SELECT id INTO v_existing_claim 
    FROM public.marketing_target_claims 
    WHERE target_id = p_target_id AND user_id = v_user_id;

    IF v_existing_claim.id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Target reward has already been claimed');
    END IF;

    -- Process Reward Payout
    v_status := CASE WHEN v_target.reward_type = 'cashback' THEN 'delivered' ELSE 'earned' END;

    IF v_target.reward_type = 'cashback' AND v_target.reward_value_paise > 0 THEN
        IF v_user_role = 'merchant' THEN
            IF v_merchant_id IS NOT NULL THEN
                PERFORM set_config('app.internal_bypass', 'true', true);

                UPDATE public.merchants
                SET wallet_balance_paise = wallet_balance_paise + v_target.reward_value_paise
                WHERE id = v_merchant_id
                RETURNING wallet_balance_paise INTO v_new_balance;

                PERFORM set_config('app.internal_bypass', 'false', true);

                INSERT INTO public.merchant_transactions (
                    merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
                ) VALUES (
                    v_merchant_id, 'marketing_cashback', v_target.reward_value_paise, v_new_balance,
                    'Milestone Reward: ' || v_target.title,
                    jsonb_build_object('target_id', v_target.id, 'target_title', v_target.title)
                );
            END IF;
        ELSE
            -- Customer Wallet
            INSERT INTO public.customer_wallets (user_id, balance_paise)
            VALUES (v_user_id, 0)
            ON CONFLICT (user_id) DO NOTHING;

            SELECT id, balance_paise INTO v_cust_wallet_id, v_bal_before
            FROM public.customer_wallets WHERE user_id = v_user_id;

            v_new_balance := v_bal_before + v_target.reward_value_paise;

            UPDATE public.customer_wallets
            SET balance_paise = v_new_balance, updated_at = now()
            WHERE id = v_cust_wallet_id;

            INSERT INTO public.customer_wallet_transactions (
                wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description, reference_id, reference_type
            ) VALUES (
                v_cust_wallet_id, v_user_id, 'CREDIT', v_target.reward_value_paise, v_bal_before, v_new_balance,
                'Milestone Reward: ' || v_target.title, v_target.id::text, 'TARGET_MILESTONE'
            );
        END IF;
    END IF;

    -- Record Claim
    INSERT INTO public.marketing_target_claims (
        target_id, user_id, user_type, gift_title,
        recipient_name, recipient_phone, shipping_address,
        status, is_completed, completed_at
    ) VALUES (
        v_target.id, v_user_id, 
        CASE WHEN v_user_role = 'merchant' THEN 'merchant' ELSE 'customer' END,
        COALESCE(v_target.gift_name, v_target.title),
        COALESCE(p_recipient_name, 'Valued Member'),
        COALESCE(p_recipient_phone, ''),
        COALESCE(p_shipping_address, ''),
        v_status, true, now()
    ) RETURNING id INTO v_claim_id;

    -- Send Notification
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_id, reference_type
    ) VALUES (
        v_user_id,
        'Milestone Reward Claimed! 🎁',
        'You have conquered ' || v_target.title || ' and claimed your reward.',
        'reward',
        v_claim_id,
        'target_claim'
    );

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'status', v_status,
        'reward_type', v_target.reward_type,
        'reward_value_paise', v_target.reward_value_paise,
        'gift_title', COALESCE(v_target.gift_name, v_target.title)
    );
EXCEPTION
    WHEN OTHERS THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 5. HARDENED ATOMIC RPC: submit_daily_challenge
CREATE OR REPLACE FUNCTION public.submit_daily_challenge(
    p_category_id UUID,
    p_score INTEGER,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID := COALESCE(p_user_id, auth.uid());
    v_base_reward_paise BIGINT := 2500;
    v_milestone_bonus_paise BIGINT := 0;
    v_total_reward_paise BIGINT := 2500;
    v_user_role TEXT;
    v_kyc_status TEXT;
    v_merchant_id UUID;
    v_merchant_status TEXT;
    v_sub_status TEXT;
    v_sub_expires TIMESTAMPTZ;
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

    -- Check user role & status
    SELECT role, kyc_status INTO v_user_role, v_kyc_status FROM public.user_profiles WHERE id = v_user_id;

    IF v_user_role = 'merchant' THEN
        SELECT id, wallet_balance_paise, status, subscription_status, subscription_expires_at 
        INTO v_merchant_id, v_cust_bal_before, v_merchant_status, v_sub_status, v_sub_expires
        FROM public.merchants WHERE user_id = v_user_id;

        IF v_merchant_id IS NULL OR v_merchant_status != 'approved' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Only approved merchants can participate in daily challenges');
        END IF;

        IF v_sub_status != 'active' OR (v_sub_expires IS NOT NULL AND v_sub_expires < now()) THEN
            RETURN jsonb_build_object('success', false, 'message', 'An active merchant subscription is required to participate in daily challenges');
        END IF;
    ELSE
        IF v_kyc_status != 'verified' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Identity verification (KYC) is required to participate in daily challenges and claim cashbacks');
        END IF;
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
EXCEPTION
    WHEN OTHERS THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 6. HARDENED process_marketing_referral_reward WITH INTERNAL BYPASS
CREATE OR REPLACE FUNCTION public.process_marketing_referral_reward(
    p_event_type TEXT,
    p_ref_code TEXT,
    p_converted_user_id UUID,
    p_product_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_link RECORD;
    v_cashback_paise BIGINT := 0;
    v_product_cashback BIGINT;
    v_new_balance BIGINT;
    v_referrer_role TEXT;
    v_cust_wallet_id UUID;
    v_cust_bal_before BIGINT;
    v_desc TEXT;
BEGIN
    SELECT * INTO v_link 
    FROM public.marketing_share_links 
    WHERE code = UPPER(p_ref_code) AND is_active = true;

    IF v_link.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or inactive referral link');
    END IF;

    IF v_link.user_id = p_converted_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Self-referrals are not permitted');
    END IF;

    IF p_event_type = 'SHARE' THEN
        UPDATE public.marketing_share_links 
        SET shares_count = shares_count + 1 
        WHERE id = v_link.id;

        INSERT INTO public.marketing_tracking_events (
            link_id, event_type, metadata
        ) VALUES (
            v_link.id, 'SHARE', jsonb_build_object('user_id', p_converted_user_id, 'product_id', p_product_id)
        );

        RETURN jsonb_build_object('success', true, 'message', 'Share recorded successfully');

    ELSIF p_event_type = 'REGISTER' THEN
        SELECT COALESCE((value->>'campaign_share_bonus_paise')::BIGINT, (value->>'referral_registration_bonus_paise')::BIGINT, 5000) INTO v_cashback_paise
        FROM public.marketing_settings WHERE key = 'rewards_config';
        v_cashback_paise := COALESCE(v_cashback_paise, 5000);
        v_desc := 'Campaign Link Sign-up Bonus';

        UPDATE public.marketing_share_links 
        SET registrations_count = registrations_count + 1 
        WHERE id = v_link.id;

    ELSIF p_event_type = 'ORDER' THEN
        -- Dynamic product referral cashback or system fallback
        IF p_product_id IS NOT NULL THEN
            SELECT promo_cashback_paise INTO v_product_cashback
            FROM public.shopping_products WHERE id = p_product_id;
        END IF;

        IF v_product_cashback IS NULL OR v_product_cashback <= 0 THEN
            SELECT COALESCE((value->>'product_promo_default_cashback_paise')::BIGINT, (value->>'referral_order_default_cashback_paise')::BIGINT, 10000) INTO v_cashback_paise
            FROM public.marketing_settings WHERE key = 'rewards_config';
            v_cashback_paise := COALESCE(v_cashback_paise, 10000);
        ELSE
            v_cashback_paise := v_product_cashback;
        END IF;
        v_desc := 'Product Promotion Referral Cashback';

        UPDATE public.marketing_share_links 
        SET orders_count = orders_count + 1 
        WHERE id = v_link.id;
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Unsupported event type: ' || p_event_type);
    END IF;

    -- Route Cashback to link owner
    IF v_link.user_type = 'merchant' AND v_link.merchant_id IS NOT NULL THEN
        PERFORM set_config('app.internal_bypass', 'true', true);

        UPDATE public.merchants 
        SET wallet_balance_paise = wallet_balance_paise + v_cashback_paise 
        WHERE id = v_link.merchant_id
        RETURNING wallet_balance_paise INTO v_new_balance;

        PERFORM set_config('app.internal_bypass', 'false', true);

        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_link.merchant_id, 'marketing_cashback', v_cashback_paise, v_new_balance, v_desc,
            jsonb_build_object('link_id', v_link.id, 'event_type', p_event_type)
        );
    ELSE
        INSERT INTO public.customer_wallets (user_id, balance_paise)
        VALUES (v_link.user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT id, balance_paise INTO v_cust_wallet_id, v_cust_bal_before
        FROM public.customer_wallets 
        WHERE user_id = v_link.user_id;

        v_new_balance := v_cust_bal_before + v_cashback_paise;

        UPDATE public.customer_wallets 
        SET balance_paise = v_new_balance, updated_at = now()
        WHERE id = v_cust_wallet_id;

        INSERT INTO public.customer_wallet_transactions (
            wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description, reference_id, reference_type
        ) VALUES (
            v_cust_wallet_id, v_link.user_id, 'CREDIT', v_cashback_paise, v_cust_bal_before, v_new_balance,
            v_desc, v_link.id::text, 'MARKETING_REFERRAL'
        );
    END IF;

    INSERT INTO public.marketing_tracking_events (
        link_id, event_type, metadata
    ) VALUES (
        v_link.id, p_event_type, jsonb_build_object('user_id', p_converted_user_id, 'cashback_paise', v_cashback_paise)
    );

    RETURN jsonb_build_object(
        'success', true,
        'reward_paise', v_cashback_paise,
        'new_balance_paise', v_new_balance
    );
EXCEPTION
    WHEN OTHERS THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 7. CONVERSION REWARD ALIAS FUNCTION
CREATE OR REPLACE FUNCTION public.process_marketing_conversion_reward(
    p_event_type TEXT,
    p_ref_code TEXT,
    p_converted_user_id UUID,
    p_product_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN public.process_marketing_referral_reward(p_event_type, p_ref_code, p_converted_user_id, p_product_id);
END;
$$;

-- 8. GRANTS
GRANT EXECUTE ON FUNCTION public.book_daily_challenge_sponsorship(DATE, JSONB, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_marketing_target_reward(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_daily_challenge(UUID, INTEGER, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_marketing_referral_reward(TEXT, TEXT, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_marketing_conversion_reward(TEXT, TEXT, UUID, UUID) TO authenticated, service_role;
