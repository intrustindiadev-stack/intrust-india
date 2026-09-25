-- =============================================================================
-- Migration: 20260925120000_surya_remediation_and_single_order_model.sql
-- Description: 
--   1. Public RPC remediate_surya_ai_grow_settlement for atomic, idempotent 
--      wallet credit of ₹29,602 to Surya Enterprises.
--   2. Update settle_ai_grow_investment to use single simulated order profit (LIMIT 1).
--   3. Trigger to enforce single simulated order per investment on merchant_investment_orders.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Dedicated, idempotent remediation RPC for Surya Enterprises
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remediate_surya_ai_grow_settlement(
    p_admin_id UUID DEFAULT 'e6442e9b-d5f6-400d-93a9-282f2ed36369'::UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_merchant_id UUID := 'fdfc3555-f5e8-44c8-91c4-3e15226a42a9'::UUID;
    v_user_id UUID := '576b1c5f-9fcf-42b0-b919-c045aa97fb12'::UUID;
    v_total_paise BIGINT := 2960200;      -- ₹29,602.00
    v_principal_paise BIGINT := 2759800;  -- ₹27,598.00 (Plan 1: ₹17,998 + Plan 2: ₹9,600)
    v_profit_paise BIGINT := 200400;      -- ₹2,004.00 (Plan 1: ₹1,202 + Plan 2: ₹802)
    v_existing_tx UUID;
    v_current_balance BIGINT;
    v_new_balance BIGINT;
    v_tx_id UUID;
    v_notif_id UUID;
    v_audit_id UUID;
BEGIN
    -- 1. Strict Idempotency Check:
    -- Verify whether remediation has already been executed
    SELECT id INTO v_existing_tx
    FROM public.merchant_transactions
    WHERE merchant_id = v_merchant_id
      AND metadata->>'source' = 'AI_GROW_RECONCILIATION';

    IF v_existing_tx IS NOT NULL THEN
        SELECT wallet_balance_paise INTO v_current_balance
        FROM public.merchants
        WHERE id = v_merchant_id;

        RETURN jsonb_build_object(
            'success', false,
            'already_remediated', true,
            'message', 'Surya Enterprises AI Grow settlement has already been remediated.',
            'merchant_id', v_merchant_id,
            'current_balance_paise', v_current_balance,
            'transaction_id', v_existing_tx
        );
    END IF;

    -- 2. Lock merchant row for update
    SELECT wallet_balance_paise INTO v_current_balance
    FROM public.merchants
    WHERE id = v_merchant_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'Merchant % not found in database', v_merchant_id
            USING ERRCODE = 'P0002';
    END IF;

    v_new_balance := v_current_balance + v_total_paise;

    -- 3. Update wallet balance with internal bypass
    PERFORM set_config('app.internal_bypass', 'true', true);

    UPDATE public.merchants
    SET wallet_balance_paise = v_new_balance,
        updated_at = NOW()
    WHERE id = v_merchant_id;

    PERFORM set_config('app.internal_bypass', 'false', true);

    -- 4. Insert into immutable merchant_transactions ledger
    INSERT INTO public.merchant_transactions (
        merchant_id,
        transaction_type,
        amount_paise,
        balance_after_paise,
        description,
        metadata
    ) VALUES (
        v_merchant_id,
        'wallet_topup',
        v_total_paise,
        v_new_balance,
        'AI Grow Settlement Correction (Reconciliation of Cash Settlement to Wallet)',
        jsonb_build_object(
            'source', 'AI_GROW_RECONCILIATION',
            'remediation_for', 'uncredited_ai_grow_settlement',
            'original_mode', 'offline_cash',
            'corrected_mode', 'wallet',
            'investments', jsonb_build_array(
                'e55cfdee-d876-4ceb-b650-28c619e21ee9',
                'd633b83d-b90a-408f-b88a-2bd83b13d7b4'
            ),
            'principal_paise', v_principal_paise,
            'profit_paise', v_profit_paise,
            'total_payout_paise', v_total_paise,
            'authorized_by', p_admin_id,
            'notes', 'Client confirmed physical cash was NOT disbursed. Corrected from cash settlement to digital wallet credit.'
        )
    ) RETURNING id INTO v_tx_id;

    -- 5. Send in-app notification to merchant
    INSERT INTO public.notifications (
        user_id,
        title,
        body,
        type,
        reference_type,
        metadata
    ) VALUES (
        v_user_id,
        'AI Grow Settlement Credited to Wallet',
        'Your AI Grow settlement of ₹29,602.00 (Principal ₹27,598.00 + Profit ₹2,004.00) has been corrected and credited to your digital wallet.',
        'success',
        'investment',
        jsonb_build_object(
            'remediation', true,
            'total_payout_paise', v_total_paise,
            'principal_paise', v_principal_paise,
            'profit_paise', v_profit_paise,
            'transaction_id', v_tx_id
        )
    ) RETURNING id INTO v_notif_id;

    -- 6. Insert audit log
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
        'super_admin'::user_role,
        'admin_action'::audit_action,
        'surya_enterprises_remediation',
        v_merchant_id,
        'Reconciled uncredited AI Grow wallet settlement of ₹29,602.00 for Surya Enterprises',
        jsonb_build_object(
            'transaction_id', v_tx_id,
            'notification_id', v_notif_id,
            'principal_paise', v_principal_paise,
            'profit_paise', v_profit_paise,
            'total_payout_paise', v_total_paise,
            'previous_balance_paise', v_current_balance,
            'new_balance_paise', v_new_balance
        )
    ) RETURNING id INTO v_audit_id;

    RETURN jsonb_build_object(
        'success', true,
        'already_remediated', false,
        'merchant_id', v_merchant_id,
        'previous_balance_paise', v_current_balance,
        'new_balance_paise', v_new_balance,
        'credited_paise', v_total_paise,
        'transaction_id', v_tx_id,
        'audit_id', v_audit_id
    );
END;
$$;

-- Permissions for remediation RPC
REVOKE ALL ON FUNCTION public.remediate_surya_ai_grow_settlement FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remediate_surya_ai_grow_settlement FROM anon;
GRANT EXECUTE ON FUNCTION public.remediate_surya_ai_grow_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION public.remediate_surya_ai_grow_settlement TO service_role;


-- -----------------------------------------------------------------------------
-- 2. Update settle_ai_grow_investment to use single simulated order profit
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

    -- 7. Calculate Principal, Single Simulated Profit and Total Payout
    v_principal_paise := v_investment.amount_paise;
    v_principal_rupees := ROUND((v_principal_paise::numeric / 100.0), 2);

    -- Intended model: 1 simulated performance order per investment (latest authoritative order)
    SELECT COALESCE(profit_paise, 0)
    INTO v_profit_paise
    FROM public.merchant_investment_orders
    WHERE investment_id = p_investment_id
    ORDER BY order_date DESC, created_at DESC
    LIMIT 1;

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

    -- 12. Audit log entry
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


-- -----------------------------------------------------------------------------
-- 3. Database-level trigger to enforce 1 simulated order per investment
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_single_investment_order()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.merchant_investment_orders
        WHERE investment_id = NEW.investment_id
    ) THEN
        RAISE EXCEPTION 'A simulated order already exists for investment %. Only one simulated order is permitted per investment. Use UPDATE to modify performance data.', NEW.investment_id
            USING ERRCODE = '23505';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_single_investment_order ON public.merchant_investment_orders;
CREATE TRIGGER trg_check_single_investment_order
    BEFORE INSERT ON public.merchant_investment_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.check_single_investment_order();
