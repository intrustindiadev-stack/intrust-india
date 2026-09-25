-- =============================================================================
-- Migration: 20260925130000_revert_single_order_restriction.sql
-- Description:
--   1. Drop trg_check_single_investment_order trigger & function to restore
--      support for multiple simulated orders per capital deployment (investment).
--   2. Update settle_ai_grow_investment to aggregate SUM(profit_paise) from all
--      simulated orders belonging to the investment being settled.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Remove 1:1 single order trigger & function
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_check_single_investment_order ON public.merchant_investment_orders;
DROP FUNCTION IF EXISTS public.check_single_investment_order();

-- -----------------------------------------------------------------------------
-- 2. Update settle_ai_grow_investment to aggregate all simulated order profits
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_ai_grow_investment(
    p_investment_id UUID,
    p_admin_id UUID,
    p_settlement_destination TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_investment RECORD;
    v_merchant RECORD;
    v_ai_wallet RECORD;
    v_principal_paise BIGINT;
    v_profit_paise BIGINT := 0;
    v_total_payout_paise BIGINT;
    v_principal_rupees NUMERIC(14,2);
    v_merchant_wallet_before BIGINT;
    v_merchant_wallet_after BIGINT;
    v_vault_before NUMERIC(14,2);
    v_vault_after NUMERIC(14,2);
    v_vault_tx_id UUID;
    v_merchant_tx_id UUID;
    v_is_super_admin BOOLEAN := FALSE;
    v_caller_role TEXT;
    v_admin_role_val user_role := 'super_admin'::user_role;
BEGIN
    -- 1. Validate destination
    IF p_settlement_destination NOT IN ('wallet', 'offline_cash') THEN
        RAISE EXCEPTION 'Invalid settlement destination: %. Must be "wallet" or "offline_cash".', p_settlement_destination
            USING ERRCODE = '22023';
    END IF;

    -- 2. Validate caller authorization
    IF p_admin_id IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = p_admin_id AND role = 'super_admin'
        ) INTO v_is_super_admin;

        IF NOT v_is_super_admin THEN
            RAISE EXCEPTION 'Access denied. Super admin role required for AI Grow settlement.'
                USING ERRCODE = '42501';
        END IF;
    ELSE
        v_caller_role := current_setting('role', true);
        IF NOT (v_caller_role IN ('service_role', 'supabase_admin') OR session_user IN ('postgres', 'supabase_admin')) THEN
            RAISE EXCEPTION 'Unauthorized: Super admin identity required for AI Grow settlement.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- 3. Lock and retrieve the investment row
    SELECT * INTO v_investment
    FROM public.merchant_investments
    WHERE id = p_investment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI Grow investment % not found.', p_investment_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 4. Idempotency Check
    IF v_investment.status IN ('completed', 'released') THEN
        RETURN jsonb_build_object(
            'success', false,
            'already_settled', true,
            'error', 'Investment has already been settled (status: ' || v_investment.status || ').',
            'investment_id', p_investment_id,
            'status', v_investment.status
        );
    END IF;

    IF v_investment.status <> 'active' THEN
        RAISE EXCEPTION 'Investment cannot be settled. Current status is "%", but must be "active".', v_investment.status
            USING ERRCODE = '55000';
    END IF;

    -- 5. Lock and retrieve the merchant row
    SELECT * INTO v_merchant
    FROM public.merchants
    WHERE id = v_investment.merchant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Merchant % not found.', v_investment.merchant_id
            USING ERRCODE = 'P0002';
    END IF;

    -- 6. Lock and retrieve the AI Grow vault wallet row
    SELECT * INTO v_ai_wallet
    FROM public.ai_grow_wallets
    WHERE merchant_id = v_investment.merchant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.ai_grow_wallets (merchant_id, balance)
        VALUES (v_investment.merchant_id, 0.00)
        RETURNING * INTO v_ai_wallet;
    END IF;

    -- 7. Calculate Principal, Profit (sum of all simulated orders for this investment) and Total Payout
    v_principal_paise := v_investment.amount_paise;
    v_principal_rupees := ROUND((v_principal_paise::numeric / 100.0), 2);

    SELECT COALESCE(SUM(profit_paise), 0)
    INTO v_profit_paise
    FROM public.merchant_investment_orders
    WHERE investment_id = p_investment_id;

    v_profit_paise := COALESCE(v_profit_paise, 0);
    v_total_payout_paise := v_principal_paise + v_profit_paise;

    IF v_principal_paise <= 0 THEN
        RAISE EXCEPTION 'Invalid investment principal: % paise.', v_principal_paise
            USING ERRCODE = '22023';
    END IF;

    -- Check vault balance
    IF v_ai_wallet.balance < v_principal_rupees THEN
        RAISE EXCEPTION 'Insufficient AI Grow vault balance: available ₹%, required ₹% for principal exit.',
            v_ai_wallet.balance, v_principal_rupees
            USING ERRCODE = '22003';
    END IF;

    v_vault_before := v_ai_wallet.balance;
    v_vault_after := v_vault_before - v_principal_rupees;
    v_merchant_wallet_before := COALESCE(v_merchant.wallet_balance_paise, 0);

    -- 8. Debit AI Grow Vault
    UPDATE public.ai_grow_wallets
    SET balance = v_vault_after,
        updated_at = NOW()
    WHERE id = v_ai_wallet.id;

    INSERT INTO public.ai_grow_wallet_transactions (
        wallet_id,
        merchant_id,
        admin_id,
        transaction_type,
        amount,
        previous_balance,
        new_balance,
        reason,
        metadata
    ) VALUES (
        v_ai_wallet.id,
        v_merchant.id,
        p_admin_id,
        'debit',
        v_principal_rupees,
        v_vault_before,
        v_vault_after,
        'AI Grow principal exit via ' || p_settlement_destination || ' settlement for investment ' || p_investment_id::text,
        jsonb_build_object(
            'investment_id', p_investment_id,
            'settlement_destination', p_settlement_destination,
            'principal_paise', v_principal_paise,
            'profit_paise', v_profit_paise,
            'total_payout_paise', v_total_payout_paise,
            'idempotency_key', p_idempotency_key,
            'notes', p_notes,
            'settled_at', NOW()
        )
    ) RETURNING id INTO v_vault_tx_id;

    -- 9. Handle Settlement Destination
    IF p_settlement_destination = 'wallet' THEN
        v_merchant_wallet_after := v_merchant_wallet_before + v_total_payout_paise;

        PERFORM set_config('app.internal_bypass', 'true', true);

        UPDATE public.merchants
        SET wallet_balance_paise = v_merchant_wallet_after,
            updated_at = NOW()
        WHERE id = v_merchant.id;

        PERFORM set_config('app.internal_bypass', 'false', true);

        INSERT INTO public.merchant_transactions (
            merchant_id,
            transaction_type,
            amount_paise,
            balance_after_paise,
            description,
            metadata
        ) VALUES (
            v_merchant.id,
            'wallet_topup',
            v_total_payout_paise,
            v_merchant_wallet_after,
            'AI Grow Capital + Profit Settled to Wallet',
            jsonb_build_object(
                'source', 'AI_GROW',
                'investment_id', p_investment_id,
                'settlement_destination', 'wallet',
                'principal_paise', v_principal_paise,
                'profit_paise', v_profit_paise,
                'total_payout_paise', v_total_payout_paise,
                'vault_transaction_id', v_vault_tx_id,
                'admin_id', p_admin_id,
                'idempotency_key', p_idempotency_key,
                'notes', p_notes,
                'settled_at', NOW()
            )
        ) RETURNING id INTO v_merchant_tx_id;

    ELSIF p_settlement_destination = 'offline_cash' THEN
        v_merchant_wallet_after := v_merchant_wallet_before;
        v_merchant_tx_id := NULL;
    END IF;

    -- 10. Mark investment status = 'completed'
    UPDATE public.merchant_investments
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_investment_id;

    -- 11. Send in-app notification
    INSERT INTO public.notifications (
        user_id,
        title,
        body,
        type,
        reference_type,
        metadata
    ) VALUES (
        v_merchant.user_id,
        CASE
            WHEN p_settlement_destination = 'wallet' THEN 'AI Grow Investment Settled to Wallet'
            ELSE 'AI Grow Investment Completed'
        END,
        CASE
            WHEN p_settlement_destination = 'wallet' THEN
                'Your AI Grow investment of ₹' || (v_principal_paise / 100)::text ||
                ' plus ₹' || (v_profit_paise / 100)::text ||
                ' simulated profit (Total ₹' || (v_total_payout_paise / 100)::text ||
                ') has been credited to your digital wallet.'
            ELSE
                'Your AI Grow investment of ₹' || (v_principal_paise / 100)::text ||
                ' has been completed (Settled offline in cash).'
        END,
        'success',
        'investment',
        jsonb_build_object(
            'investment_id', p_investment_id,
            'settlement_destination', p_settlement_destination,
            'principal_paise', v_principal_paise,
            'profit_paise', v_profit_paise,
            'total_payout_paise', v_total_payout_paise,
            'credited_to_wallet', (p_settlement_destination = 'wallet')
        )
    );

    -- 12. Audit log entry (entity_id is UUID)
    INSERT INTO public.audit_logs (
        actor_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        description,
        metadata
    ) VALUES (
        p_admin_id,
        v_admin_role_val,
        'admin_action'::audit_action,
        'merchant_investments',
        p_investment_id,
        'Settled AI Grow investment ' || p_investment_id::text || ' via destination ' || p_settlement_destination,
        jsonb_build_object(
            'destination', p_settlement_destination,
            'principal_paise', v_principal_paise,
            'profit_paise', v_profit_paise,
            'total_payout_paise', v_total_payout_paise,
            'wallet_before', v_merchant_wallet_before,
            'wallet_after', v_merchant_wallet_after,
            'vault_before', v_vault_before,
            'vault_after', v_vault_after,
            'vault_transaction_id', v_vault_tx_id,
            'merchant_transaction_id', v_merchant_tx_id,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'investment_id', p_investment_id,
        'status', 'completed',
        'settlement_destination', p_settlement_destination,
        'principal_paise', v_principal_paise,
        'profit_paise', v_profit_paise,
        'total_payout_paise', v_total_payout_paise,
        'merchant_wallet_before_paise', v_merchant_wallet_before,
        'merchant_wallet_after_paise', v_merchant_wallet_after,
        'vault_before_rupees', v_vault_before,
        'vault_after_rupees', v_vault_after,
        'vault_transaction_id', v_vault_tx_id,
        'merchant_transaction_id', v_merchant_tx_id
    );
END;
$$;

-- Permissions for settle_ai_grow_investment
REVOKE ALL ON FUNCTION public.settle_ai_grow_investment FROM PUBLIC;
REVOKE ALL ON FUNCTION public.settle_ai_grow_investment FROM anon;
GRANT EXECUTE ON FUNCTION public.settle_ai_grow_investment TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_ai_grow_investment TO service_role;
