-- Migration: Fix merchant wallet deduction in book_daily_challenge_sponsorship
-- Created: 2026-09-18
-- Description: Sets app.internal_bypass='true' during merchant wallet balance deduction
--              to satisfy the merchants_block_sensitive_column_updates trigger.

CREATE OR REPLACE FUNCTION public.book_daily_challenge_sponsorship(
    p_sponsor_date DATE,
    p_product_ids JSONB,
    p_campaign_message TEXT,
    p_payment_method TEXT DEFAULT 'wallet',
    p_client_txn_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_merchant_id UUID;
    v_merchant_balance BIGINT;
    v_new_balance BIGINT;
    v_fee_paise BIGINT;
    v_booking_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    SELECT id, wallet_balance_paise INTO v_merchant_id, v_merchant_balance
    FROM public.merchants WHERE user_id = v_user_id;
    
    IF v_merchant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Only verified merchants can sponsor challenges');
    END IF;

    -- Dynamic fee from marketing_settings
    SELECT (value->>'sponsorship_fee_paise')::BIGINT INTO v_fee_paise
    FROM public.marketing_settings WHERE key = 'rewards_config';
    v_fee_paise := COALESCE(v_fee_paise, 99900);

    IF p_sponsor_date <= CURRENT_DATE THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sponsorship dates must be in the future');
    END IF;

    IF p_payment_method = 'wallet' AND v_merchant_balance < v_fee_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance to book sponsorship');
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
        'Your featured sponsorship for ' || to_char(p_sponsor_date, 'DD Mon YYYY') || ' is confirmed.',
        'info',
        v_booking_id,
        'sponsorship'
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'fee_paid_paise', v_fee_paise,
        'new_balance_paise', v_new_balance,
        'sponsor_date', p_sponsor_date
    );
EXCEPTION
    WHEN OTHERS THEN
        PERFORM set_config('app.internal_bypass', 'false', true);
        RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
