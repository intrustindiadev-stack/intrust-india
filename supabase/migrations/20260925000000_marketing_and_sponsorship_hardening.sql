-- Migration: Marketing Engine, Security Lockdown & Sponsorship Hardening
-- Date: 2026-09-25
-- Description:
--   1. Hardens process_marketing_referral_reward with SHARE-first ordering, owner validation,
--      strict server-side barrier for ORDER/REGISTER, and deduplication via p_reference_id.
--   2. Hardens claim_marketing_target_reward with caller authentication, server-side progress
--      evaluation matching live metric_type values ('share_links', 'link_clicks', 'store_sales'),
--      and strict identity verification.
--   3. Recreates book_daily_challenge_sponsorship with exact live schema, 'booked' status,
--      merchant ownership enforcement, valid 'sponsorship' ledger entry, and service_role grant.
--   4. Creates atomic increment_marketing_link_clicks RPC.
--   5. Adds partial unique index on marketing_tracking_events for referral deduplication.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DROP OBSOLETE & STALE OVERLOADS
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.book_daily_challenge_sponsorship(DATE, JSONB, TEXT, TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.book_daily_challenge_sponsorship(DATE, JSONB, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.book_daily_challenge_sponsorship(DATE, JSONB, TEXT, TEXT, TEXT);

DROP FUNCTION IF EXISTS public.claim_marketing_target_reward(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.claim_marketing_target_reward(UUID, TEXT, TEXT, TEXT, UUID);

DROP FUNCTION IF EXISTS public.process_marketing_conversion_reward(TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.process_marketing_referral_reward(TEXT, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.process_marketing_conversion_reward(TEXT, TEXT, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.process_marketing_referral_reward(TEXT, TEXT, UUID, UUID, TEXT);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PARTIAL UNIQUE INDEX FOR REFERRAL DEDUPLICATION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_mte_order_dedupe 
ON public.marketing_tracking_events (link_id, event_type, (metadata->>'ref_id')) 
WHERE event_type IN ('ORDER', 'REGISTER');

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ATOMIC LINK CLICKS INCREMENT RPC
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_marketing_link_clicks(p_link_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.marketing_share_links
    SET clicks_count = clicks_count + 1
    WHERE id = p_link_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_marketing_link_clicks(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_marketing_link_clicks(UUID) TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HARDENED process_marketing_referral_reward
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_marketing_referral_reward(
    p_event_type TEXT,
    p_ref_code TEXT,
    p_converted_user_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_link RECORD;
    v_cashback_paise BIGINT := 0;
    v_product_cashback BIGINT;
    v_new_balance BIGINT;
    v_cust_wallet_id UUID;
    v_cust_bal_before BIGINT;
    v_desc TEXT;
    v_ref_id TEXT;
    v_existing_event UUID;
BEGIN
    SELECT * INTO v_link 
    FROM public.marketing_share_links 
    WHERE code = UPPER(p_ref_code);

    IF v_link.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid or inactive referral link');
    END IF;

    -- ── 1. SHARE Event (Client Accessible by Link Owner) ────────────────────
    IF p_event_type = 'SHARE' THEN
        -- Only link owner or backend service_role can record SHARE
        IF auth.uid() IS NOT NULL AND auth.uid() <> v_link.user_id THEN
            RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Only link owner can record share metrics');
        END IF;

        UPDATE public.marketing_share_links 
        SET shares_count = shares_count + 1 
        WHERE id = v_link.id;

        INSERT INTO public.marketing_tracking_events (
            link_id, event_type, metadata
        ) VALUES (
            v_link.id, 'SHARE', jsonb_build_object(
                'user_id', COALESCE(p_converted_user_id, v_link.user_id), 
                'product_id', p_product_id,
                'ref_id', p_reference_id
            )
        );

        RETURN jsonb_build_object('success', true, 'message', 'Share recorded successfully');

    -- ── 2. Money Minting Events: REGISTER & ORDER (Server-Side Only) ────────
    ELSIF auth.uid() IS NOT NULL THEN
        -- Hard barrier: reject any browser/user JWT calling money minting events via PostgREST
        RETURN jsonb_build_object('success', false, 'message', 'Server-side invocation only');
    END IF;

    -- Self-referral guard strictly for REGISTER and ORDER
    IF v_link.user_id = p_converted_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Self-referrals are not permitted');
    END IF;

    -- Deduplication key resolution
    IF p_event_type = 'REGISTER' THEN
        v_ref_id := COALESCE(p_reference_id, p_converted_user_id::text);
    ELSE
        v_ref_id := p_reference_id;
    END IF;

    -- Deduplication check BEFORE wallet credit
    IF v_ref_id IS NOT NULL THEN
        SELECT id INTO v_existing_event
        FROM public.marketing_tracking_events
        WHERE link_id = v_link.id 
          AND event_type = p_event_type 
          AND metadata->>'ref_id' = v_ref_id
        LIMIT 1;

        IF v_existing_event IS NOT NULL THEN
            RETURN jsonb_build_object('success', false, 'message', 'Referral reward already credited for this reference');
        END IF;
    END IF;

    -- Reward calculation
    IF p_event_type = 'REGISTER' THEN
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

    -- Insert tracking record (with ref_id for partial index enforcement)
    INSERT INTO public.marketing_tracking_events (
        link_id, event_type, metadata
    ) VALUES (
        v_link.id, p_event_type, jsonb_build_object(
            'user_id', p_converted_user_id,
            'cashback_paise', v_cashback_paise,
            'product_id', p_product_id,
            'ref_id', v_ref_id
        )
    );

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
            jsonb_build_object('link_id', v_link.id, 'event_type', p_event_type, 'ref_id', v_ref_id)
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
            v_desc, COALESCE(v_ref_id, v_link.id::text), 'MARKETING_REFERRAL'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'reward_paise', v_cashback_paise,
        'new_balance_paise', v_new_balance,
        'event_type', p_event_type
    );
END;
$$;

-- Alias wrapper
CREATE OR REPLACE FUNCTION public.process_marketing_conversion_reward(
    p_event_type TEXT,
    p_ref_code TEXT,
    p_converted_user_id UUID,
    p_product_id UUID DEFAULT NULL,
    p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN public.process_marketing_referral_reward(p_event_type, p_ref_code, p_converted_user_id, p_product_id, p_reference_id);
END;
$$;

REVOKE ALL ON FUNCTION public.process_marketing_referral_reward(TEXT, TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_marketing_referral_reward(TEXT, TEXT, UUID, UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.process_marketing_conversion_reward(TEXT, TEXT, UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_marketing_conversion_reward(TEXT, TEXT, UUID, UUID, TEXT) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. HARDENED claim_marketing_target_reward
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.claim_marketing_target_reward(
    p_target_id UUID,
    p_recipient_name TEXT DEFAULT NULL,
    p_recipient_phone TEXT DEFAULT NULL,
    p_shipping_address TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
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
    v_stats JSONB;
    v_streak JSONB;
    v_current_progress BIGINT := 0;
BEGIN
    -- Strict Identity Resolution
    IF auth.uid() IS NOT NULL THEN
        -- Browser/PostgREST caller: caller cannot claim for another user
        IF p_user_id IS NOT NULL AND p_user_id <> auth.uid() THEN
            RETURN jsonb_build_object('success', false, 'message', 'Forbidden: Identity mismatch');
        END IF;
        v_user_id := auth.uid();
    ELSE
        -- Backend service_role (API route caller)
        v_user_id := p_user_id;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
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

    -- Verify server-side progress matching live metric_type values
    v_stats := public.get_marketing_dashboard_stats(v_user_id);
    v_streak := public.get_user_quiz_streak(v_user_id);

    IF v_target.metric_type = 'quiz_streak' THEN
        v_current_progress := GREATEST(COALESCE((v_streak->>'current_streak')::BIGINT, 0), COALESCE((v_streak->>'highest_streak')::BIGINT, 0));
    ELSIF v_target.metric_type = 'share_links' THEN
        v_current_progress := COALESCE((v_stats->>'total_shares')::BIGINT, 0);
    ELSIF v_target.metric_type = 'link_clicks' THEN
        v_current_progress := COALESCE((v_stats->>'link_clicks')::BIGINT, 0);
    ELSIF v_target.metric_type = 'referrals' THEN
        v_current_progress := COALESCE((v_stats->>'new_customers')::BIGINT, 0);
    ELSIF v_target.metric_type = 'store_sales' THEN
        v_current_progress := COALESCE((v_stats->>'orders')::BIGINT, 0);
    ELSIF v_target.metric_type = 'user_registration' THEN
        v_current_progress := 1;
    ELSIF v_target.metric_type = 'first_order' THEN
        v_current_progress := CASE WHEN COALESCE((v_stats->>'orders')::BIGINT, 0) >= 1 THEN 1 ELSE 0 END;
    ELSIF v_target.metric_type = 'daily_login' THEN
        v_current_progress := GREATEST(COALESCE((v_streak->>'current_streak')::BIGINT, 0), 1);
    ELSE
        v_current_progress := COALESCE((v_stats->>'total_shares')::BIGINT, 0) + COALESCE((v_stats->>'orders')::BIGINT, 0);
    END IF;

    IF v_current_progress < v_target.target_value THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Target requirement not yet reached (' || v_current_progress::text || '/' || v_target.target_value::text || ')'
        );
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

    -- Process Reward Payout
    v_status := CASE WHEN v_target.reward_type = 'cashback' THEN 'delivered' ELSE 'earned' END;

    IF v_target.reward_type = 'cashback' AND v_target.reward_value_paise > 0 THEN
        IF v_user_role = 'merchant' AND v_merchant_id IS NOT NULL THEN
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
                'Marketing Milestone Reward: ' || v_target.title,
                jsonb_build_object('target_id', v_target.id, 'reward_type', 'cashback')
            );
        ELSE
            INSERT INTO public.customer_wallets (user_id, balance_paise)
            VALUES (v_user_id, 0)
            ON CONFLICT (user_id) DO NOTHING;

            SELECT id, balance_paise INTO v_cust_wallet_id, v_bal_before
            FROM public.customer_wallets 
            WHERE user_id = v_user_id;

            v_new_balance := v_bal_before + v_target.reward_value_paise;

            UPDATE public.customer_wallets 
            SET balance_paise = v_new_balance, updated_at = now()
            WHERE id = v_cust_wallet_id;

            INSERT INTO public.customer_wallet_transactions (
                wallet_id, user_id, type, amount_paise, balance_before_paise, balance_after_paise, description, reference_id, reference_type
            ) VALUES (
                v_cust_wallet_id, v_user_id, 'CREDIT', v_target.reward_value_paise, v_bal_before, v_new_balance,
                'Marketing Milestone Reward: ' || v_target.title, v_target.id::text, 'MARKETING_TARGET'
            );
        END IF;
    END IF;

    -- Record Claim
    INSERT INTO public.marketing_target_claims (
        target_id, user_id, user_type, gift_title,
        recipient_name, recipient_phone, shipping_address,
        status, current_progress, is_completed, completed_at, claimed_at
    ) VALUES (
        v_target.id, v_user_id, COALESCE(v_user_role, 'customer'), COALESCE(v_target.gift_name, v_target.title),
        p_recipient_name, p_recipient_phone, p_shipping_address,
        v_status, v_current_progress, true, now(), now()
    ) RETURNING id INTO v_claim_id;

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', v_claim_id,
        'status', v_status,
        'gift_title', COALESCE(v_target.gift_name, v_target.title),
        'reward_paise', v_target.reward_value_paise,
        'new_balance_paise', v_new_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_marketing_target_reward(UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_marketing_target_reward(UUID, TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. HARDENED book_daily_challenge_sponsorship
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.book_daily_challenge_sponsorship(
    p_sponsor_date DATE,
    p_product_ids JSONB,
    p_campaign_message TEXT,
    p_payment_method TEXT DEFAULT 'wallet',
    p_client_txn_id TEXT DEFAULT NULL,
    p_merchant_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID;
    v_merchant_id UUID;
    v_merchant_name TEXT;
    v_merchant_balance BIGINT;
    v_merchant_status TEXT;
    v_sub_status TEXT;
    v_sub_expires TIMESTAMPTZ;
    v_new_balance BIGINT;
    v_fee_paise BIGINT;
    v_booking_id UUID;
    v_existing_booking UUID;
BEGIN
    -- Authenticate caller
    IF auth.uid() IS NOT NULL THEN
        v_user_id := auth.uid();
    ELSE
        v_user_id := p_user_id;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Authentication required');
    END IF;

    -- Verify merchant ownership: caller must own the merchant account
    IF p_merchant_id IS NOT NULL THEN
        SELECT id, business_name, wallet_balance_paise, status, subscription_status, subscription_expires_at
        INTO v_merchant_id, v_merchant_name, v_merchant_balance, v_merchant_status, v_sub_status, v_sub_expires
        FROM public.merchants 
        WHERE id = p_merchant_id AND user_id = v_user_id;
    ELSE
        SELECT id, business_name, wallet_balance_paise, status, subscription_status, subscription_expires_at
        INTO v_merchant_id, v_merchant_name, v_merchant_balance, v_merchant_status, v_sub_status, v_sub_expires
        FROM public.merchants 
        WHERE user_id = v_user_id 
        LIMIT 1;
    END IF;

    IF v_merchant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You do not own this merchant account');
    END IF;

    IF v_merchant_status != 'approved' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only verified and approved merchants can sponsor challenges');
    END IF;

    IF v_sub_status != 'active' OR (v_sub_expires IS NOT NULL AND v_sub_expires < now()) THEN
        RETURN jsonb_build_object('success', false, 'message', 'An active merchant subscription is required to sponsor daily challenges');
    END IF;

    -- Check future date
    IF p_sponsor_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sponsorship dates must be in the future');
    END IF;

    -- Check if date already booked
    SELECT id INTO v_existing_booking
    FROM public.daily_challenge_sponsorships
    WHERE sponsor_date = p_sponsor_date AND status IN ('booked', 'live');

    IF v_existing_booking IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'This date is already sponsored. Please choose another date.');
    END IF;

    -- Dynamic fee from marketing_settings (base fee + 18% GST)
    SELECT (value->>'sponsorship_fee_paise')::BIGINT INTO v_fee_paise
    FROM public.marketing_settings WHERE key = 'rewards_config';
    v_fee_paise := COALESCE(v_fee_paise, 99900);
    -- 18% GST (9% CGST + 9% SGST)
    v_fee_paise := v_fee_paise + ROUND(v_fee_paise * 0.18);

    IF p_payment_method = 'wallet' THEN
        IF v_merchant_balance < v_fee_paise THEN
            RETURN jsonb_build_object(
                'success', false, 
                'message', 'Insufficient wallet balance (₹' || (v_merchant_balance/100)::text || '). Total payable with 18% GST is ₹' || (v_fee_paise/100)::text
            );
        END IF;

        -- Lock booking in live schema
        INSERT INTO public.daily_challenge_sponsorships (
            sponsor_date, merchant_id, product_ids, campaign_message, fee_paise, status
        ) VALUES (
            p_sponsor_date, v_merchant_id, COALESCE(p_product_ids, '[]'::jsonb), p_campaign_message, v_fee_paise, 'booked'
        ) RETURNING id INTO v_booking_id;

        -- Deduct from merchant wallet with bypass
        PERFORM set_config('app.internal_bypass', 'true', true);

        UPDATE public.merchants 
        SET wallet_balance_paise = wallet_balance_paise - v_fee_paise
        WHERE id = v_merchant_id
        RETURNING wallet_balance_paise INTO v_new_balance;

        PERFORM set_config('app.internal_bypass', 'false', true);

        -- Record transaction with correct schema and valid type 'sponsorship'
        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, balance_after_paise, description, metadata
        ) VALUES (
            v_merchant_id, 'sponsorship', v_fee_paise, v_new_balance, 
            'Daily Challenge Sponsorship for ' || to_char(p_sponsor_date, 'DD Mon YYYY'),
            jsonb_build_object('booking_id', v_booking_id, 'sponsor_date', p_sponsor_date, 'payment_method', 'wallet')
        );

        RETURN jsonb_build_object(
            'success', true,
            'booking_id', v_booking_id,
            'merchant_id', v_merchant_id,
            'sponsor_date', p_sponsor_date,
            'fee_paise', v_fee_paise,
            'new_balance_paise', v_new_balance
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Use backend route for gateway sponsorship');
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.book_daily_challenge_sponsorship(DATE, JSONB, TEXT, TEXT, TEXT, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.book_daily_challenge_sponsorship(DATE, JSONB, TEXT, TEXT, TEXT, UUID, UUID) TO service_role;
