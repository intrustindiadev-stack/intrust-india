-- 20260704_atomic_customer_wallet_credit.sql
-- Adds an atomic RPC for customer wallet topups and credits, ensuring that the
-- wallet balance update and transaction insert happen atomically. This prevents 
-- race conditions where a unique constraint violation on the transaction insert
-- leaves the wallet balance artificially incremented.

CREATE OR REPLACE FUNCTION atomic_customer_wallet_credit(
    p_user_id UUID,
    p_amount_paise BIGINT,
    p_type TEXT,
    p_description TEXT,
    p_reference_id TEXT,
    p_reference_type TEXT
) RETURNS json AS $$
DECLARE
    v_wallet_id UUID;
    v_balance_before BIGINT;
    v_balance_after BIGINT;
    v_tx_id UUID;
BEGIN
    -- 1. Ensure wallet exists and lock it for update
    INSERT INTO public.customer_wallets (user_id, balance_paise, status)
    VALUES (p_user_id, 0, 'ACTIVE')
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, balance_paise INTO v_wallet_id, v_balance_before
    FROM public.customer_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- 2. Calculate new balance
    v_balance_after := v_balance_before + p_amount_paise;

    -- 3. Update wallet and insert transaction inside a nested block
    -- This ensures that if the unique constraint (e.g. for TOPUPs) fires,
    -- the balance update is atomically rolled back with the insert.
    BEGIN
        UPDATE public.customer_wallets
        SET balance_paise = v_balance_after, updated_at = now()
        WHERE id = v_wallet_id;

        INSERT INTO public.customer_wallet_transactions (
            wallet_id, user_id, type, amount_paise,
            balance_before_paise, balance_after_paise,
            description, reference_id, reference_type
        ) VALUES (
            v_wallet_id, p_user_id, p_type, p_amount_paise,
            v_balance_before, v_balance_after,
            p_description, p_reference_id, p_reference_type
        ) RETURNING id INTO v_tx_id;
    EXCEPTION WHEN unique_violation THEN
        -- Rollback occurs for the nested block only (wallet update and tx insert)
        RETURN json_build_object('success', false, 'duplicate', true, 'message', 'Unique constraint violation');
    END;

    RETURN json_build_object(
        'success', true, 
        'duplicate', false, 
        'wallet_id', v_wallet_id,
        'transaction_id', v_tx_id, 
        'balance_after_paise', v_balance_after
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
