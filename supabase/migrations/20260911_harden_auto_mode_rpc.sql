-- Migration: Harden merchant_activate_auto_mode RPC
-- Sets explicit search_path = public and configures permissions

CREATE OR REPLACE FUNCTION public.merchant_activate_auto_mode(
    p_merchant_id UUID,
    p_price_paise BIGINT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance BIGINT;
    v_months_paid INTEGER;
    v_new_balance BIGINT;
    v_valid_until TIMESTAMPTZ;
BEGIN
    -- Get merchant and lock row for update to prevent concurrent balance deductions
    SELECT wallet_balance_paise, COALESCE(auto_mode_months_paid, 0)
    INTO v_current_balance, v_months_paid
    FROM public.merchants
    WHERE id = p_merchant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Merchant record not found');
    END IF;

    -- Atomically check balance
    IF v_current_balance < p_price_paise THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient wallet balance');
    END IF;

    -- Calculate updated values
    v_new_balance := v_current_balance - p_price_paise;
    v_valid_until := NOW() + INTERVAL '30 days';
    v_months_paid := v_months_paid + 1;

    -- Deduct and Activate in a single atomic transaction
    UPDATE public.merchants
    SET 
        wallet_balance_paise = v_new_balance,
        auto_mode = true,
        auto_mode_status = 'active',
        auto_mode_months_paid = v_months_paid,
        auto_mode_valid_until = v_valid_until,
        updated_at = NOW()
    WHERE id = p_merchant_id;

    -- Log transaction to ledger (atomic under the same transaction)
    INSERT INTO public.merchant_transactions (
        merchant_id,
        amount_paise,
        transaction_type,
        description,
        balance_after_paise,
        metadata,
        created_at
    ) VALUES (
        p_merchant_id,
        -p_price_paise,
        'subscription',
        p_description,
        v_new_balance,
        p_metadata,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Auto Mode activated successfully',
        'new_balance', v_new_balance,
        'valid_until', v_valid_until,
        'months_paid', v_months_paid
    );

EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'RPC merchant_activate_auto_mode failed. SQLSTATE: %, SQLERRM: %', SQLSTATE, SQLERRM;
    RETURN jsonb_build_object(
        'success', false, 
        'message', 'Database error: ' || SQLSTATE || ' - ' || SQLERRM
    );
END;
$$;

-- Permissions and grants
REVOKE EXECUTE ON FUNCTION public.merchant_activate_auto_mode(UUID, BIGINT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.merchant_activate_auto_mode(UUID, BIGINT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.merchant_activate_auto_mode(UUID, BIGINT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_activate_auto_mode(UUID, BIGINT, TEXT, JSONB) TO service_role;
