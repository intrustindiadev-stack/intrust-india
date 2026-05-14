-- FIX MERCHANT SETTLEMENT TRIGGER & BACKFILL MISSED CREDITS
-- Created: 2026-04-23
-- Refined to bypass sensitive column guards via 'app.internal_bypass'

-- 1. Update merchants_block_sensitive_column_updates to allow internal bypass
CREATE OR REPLACE FUNCTION public.merchants_block_sensitive_column_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- ALLOW BYPASS for legitimate system logic
    IF current_setting('app.internal_bypass', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- Block financial columns
    IF NEW.wallet_balance_paise IS DISTINCT FROM OLD.wallet_balance_paise THEN
        RAISE EXCEPTION 'Column wallet_balance_paise is protected and cannot be updated directly.';
    END IF;
    IF NEW.total_commission_paid_paise IS DISTINCT FROM OLD.total_commission_paid_paise THEN
        RAISE EXCEPTION 'Column total_commission_paid_paise is protected and cannot be updated directly.';
    END IF;

    -- Block status and subscription columns
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Column status is protected and can only be updated by admins.';
    END IF;
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
        RAISE EXCEPTION 'Column subscription_status is protected and cannot be updated directly.';
    END IF;
    IF NEW.subscription_expires_at IS DISTINCT FROM OLD.subscription_expires_at THEN
        RAISE EXCEPTION 'Column subscription_expires_at is protected and cannot be updated directly.';
    END IF;

    -- Block auto-mode columns
    IF NEW.auto_mode_status IS DISTINCT FROM OLD.auto_mode_status THEN
        RAISE EXCEPTION 'Column auto_mode_status is protected and controlled via RPC.';
    END IF;
    IF NEW.auto_mode_months_paid IS DISTINCT FROM OLD.auto_mode_months_paid THEN
        RAISE EXCEPTION 'Column auto_mode_months_paid is protected and cannot be updated directly.';
    END IF;
    IF NEW.auto_mode_valid_until IS DISTINCT FROM OLD.auto_mode_valid_until THEN
        RAISE EXCEPTION 'Column auto_mode_valid_until is protected and cannot be updated directly.';
    END IF;
    IF NEW.auto_mode IS DISTINCT FROM OLD.auto_mode THEN
        RAISE EXCEPTION 'Column auto_mode is protected and controlled via RPC.';
    END IF;

    -- Block failure tracking and admin columns
    IF NEW.fulfillment_failure_count IS DISTINCT FROM OLD.fulfillment_failure_count THEN
        RAISE EXCEPTION 'Column fulfillment_failure_count is protected and set by admin takeover only.';
    END IF;
    IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
        RAISE EXCEPTION 'Column rejection_reason is admin-only.';
    END IF;
    IF NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason THEN
        RAISE EXCEPTION 'Column suspension_reason is admin-only.';
    END IF;

    -- Block audit timestamps
    IF NEW.applied_at IS DISTINCT FROM OLD.applied_at THEN
        RAISE EXCEPTION 'Column applied_at is immutable.';
    END IF;
    IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
        RAISE EXCEPTION 'Column approved_at is immutable.';
    END IF;
    IF NEW.rejected_at IS DISTINCT FROM OLD.rejected_at THEN
        RAISE EXCEPTION 'Column rejected_at is immutable.';
    END IF;

    -- Block KYC columns
    IF NEW.pan_number IS DISTINCT FROM OLD.pan_number THEN
        RAISE EXCEPTION 'Column pan_number is protected and set during onboarding only.';
    END IF;
    IF NEW.pan_verified IS DISTINCT FROM OLD.pan_verified THEN
        RAISE EXCEPTION 'Column pan_verified is protected.';
    END IF;
    IF NEW.pan_data IS DISTINCT FROM OLD.pan_data THEN
        RAISE EXCEPTION 'Column pan_data is protected.';
    END IF;
    IF NEW.gstin_verified IS DISTINCT FROM OLD.gstin_verified THEN
        RAISE EXCEPTION 'Column gstin_verified is protected.';
    END IF;
    IF NEW.gstin_data IS DISTINCT FROM OLD.gstin_data THEN
        RAISE EXCEPTION 'Column gstin_data is protected.';
    END IF;
    IF NEW.bank_verified IS DISTINCT FROM OLD.bank_verified THEN
        RAISE EXCEPTION 'Column bank_verified is protected.';
    END IF;
    IF NEW.bank_data IS DISTINCT FROM OLD.bank_data THEN
        RAISE EXCEPTION 'Column bank_data is protected.';
    END IF;

    -- Block bank details
    IF NEW.bank_account_number IS DISTINCT FROM OLD.bank_account_number THEN
        RAISE EXCEPTION 'Column bank_account_number is protected and requires re-verification.';
    END IF;
    IF NEW.bank_ifsc_code IS DISTINCT FROM OLD.bank_ifsc_code THEN
        RAISE EXCEPTION 'Column bank_ifsc_code is protected and requires re-verification.';
    END IF;
    IF NEW.bank_name IS DISTINCT FROM OLD.bank_name THEN
        RAISE EXCEPTION 'Column bank_name is protected.';
    END IF;
    IF NEW.bank_account_name IS DISTINCT FROM OLD.bank_account_name THEN
        RAISE EXCEPTION 'Column bank_account_name is protected.';
    END IF;

    -- Block slug
    IF NEW.slug IS DISTINCT FROM OLD.slug THEN
        RAISE EXCEPTION 'Column slug is immutable after approval.';
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Update order_groups_merchant_update_guard to allow internal bypass
CREATE OR REPLACE FUNCTION public.order_groups_merchant_update_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    user_role text;
BEGIN
    -- ALLOW BYPASS for legitimate system logic
    IF current_setting('app.internal_bypass', true) = 'true' THEN
        RETURN NEW;
    END IF;

    -- 1. Get the role of the authenticated user
    SELECT role INTO user_role 
    FROM public.user_profiles 
    WHERE id = auth.uid();

    -- 2. If admin, super_admin, or a regular customer (user), allow the update.
    -- We ONLY want to restrict users explicitly tagged as 'merchant'.
    IF user_role IS NULL OR user_role != 'merchant' THEN
        RETURN NEW;
  
    END IF;

    -- 3. Restrict columns for merchants ONLY
    IF NEW.merchant_profit_paise IS DISTINCT FROM OLD.merchant_profit_paise OR
       NEW.platform_cut_paise IS DISTINCT FROM OLD.platform_cut_paise OR
       NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR
       NEW.settlement_status IS DISTINCT FROM OLD.settlement_status OR
       NEW.total_amount_paise IS DISTINCT FROM OLD.total_amount_paise OR
       NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
       NEW.merchant_id IS DISTINCT FROM OLD.merchant_id OR
       NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
       NEW.payment_status IS DISTINCT FROM OLD.payment_status OR
       NEW.assigned_to IS DISTINCT FROM OLD.assigned_to OR
       NEW.admin_takeover_at IS DISTINCT FROM OLD.admin_takeover_at OR
       NEW.delivery_fee_paise IS DISTINCT FROM OLD.delivery_fee_paise OR
       NEW.is_platform_order IS DISTINCT FROM OLD.is_platform_order OR
       NEW.client_txn_id IS DISTINCT FROM OLD.client_txn_id
    THEN
        RAISE EXCEPTION 'Restricted column update detected. Merchants can only update delivery status, tracking number, and notes.';
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Refactor update_order_delivery_v3 with bypass flag
CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(
    p_order_id uuid,
    p_new_status text,
    p_tracking_number text,
    p_estimated_at timestamptz,
    p_status_notes text,
    p_is_admin boolean DEFAULT false,
    p_is_merchant boolean DEFAULT false,
    p_is_customer boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_user_id uuid;
BEGIN
    -- Set internal bypass flag to allow column updates restricted by triggers
    PERFORM set_config('app.internal_bypass', 'true', true);

    -- Get caller ID from auth
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Basic Authorization Checks
    IF p_is_admin THEN
        -- Admin checks: Use the is_admin() helper
        IF NOT public.is_admin() THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;
    ELSIF p_is_merchant THEN
        -- Merchant checks (must own the order)
        IF v_order.merchant_id IS NOT NULL AND v_order.merchant_id != v_user_id THEN
            -- Check if user is an admin acting as merchant
            IF NOT public.is_admin() THEN
                RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
            END IF;
        END IF;
    ELSIF p_is_customer THEN
        -- Customer checks (must own the order)
        IF v_order.customer_id != v_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;
    ELSE
         RETURN json_build_object('success', false, 'message', 'Unauthorized: Missing role flag');
    END IF;

    -- Update Order Status
    UPDATE public.shopping_order_groups
    SET delivery_status = p_new_status,
        tracking_number = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes = p_status_notes,
        updated_at = NOW(),
        status_updated_by = v_user_id
    WHERE id = p_order_id;

    -- SETTLEMENT LOGIC (Settle on fulfillment)
    IF p_new_status IN ('packed', 'shipped', 'delivered') 
       AND v_order.settlement_status = 'pending' 
       AND (p_is_merchant = true OR p_is_admin = true) THEN
       
       -- Credit the merchant wallet (70% share)
       UPDATE public.merchants 
       SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + COALESCE(v_order.merchant_profit_paise, 0),
           total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + COALESCE(v_order.platform_cut_paise, 0)
       WHERE id = v_order.merchant_id;

       -- Insert merchant transaction
       INSERT INTO public.merchant_transactions (
           merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
       ) VALUES (
           v_order.merchant_id, 'sale', COALESCE(v_order.merchant_profit_paise, 0), COALESCE(v_order.platform_cut_paise, 0),
           (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
           'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Fulfillment)'
       );

       -- INSERT platform_ledger for shopping commission
       INSERT INTO public.platform_ledger (
           transaction_id,
           entry_type,
           amount_paise,
           balance_after_paise,
           description,
           created_at
       ) VALUES (
           p_order_id,
           'shopping_commission',
           COALESCE(v_order.platform_cut_paise, 0),
           (SELECT COALESCE(SUM(amount_paise), 0)
            FROM public.platform_ledger
            WHERE entry_type = 'shopping_commission') + COALESCE(v_order.platform_cut_paise, 0),
           'Shopping commission: Order #' || substring(p_order_id::text from 1 for 8),
           NOW()
       );

       -- Update settlement_status to settled
       UPDATE public.shopping_order_groups 
       SET settlement_status = 'settled' 
       WHERE id = p_order_id;
    END IF;

    -- Reset bypass flag
    PERFORM set_config('app.internal_bypass', 'false', true);

    RETURN json_build_object('success', true, 'message', 'Order status updated successfully');
EXCEPTION WHEN OTHERS THEN
    -- Ensure flag is reset on error
    PERFORM set_config('app.internal_bypass', 'false', true);
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. BACKFILL: Settle missed orders #814223EB and #7AB0A1DD
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Set bypass flag
    PERFORM set_config('app.internal_bypass', 'true', true);

    FOR r IN (
        SELECT id, merchant_id, merchant_profit_paise, platform_cut_paise
        FROM public.shopping_order_groups
        WHERE id IN ('814223eb-f845-4a35-a149-4cfa6c24756d', '7ab0a1dd-edbf-4000-9f32-4946273d6014')
          AND settlement_status = 'pending'
    ) LOOP
        -- Credit Merchant
        UPDATE public.merchants 
        SET wallet_balance_paise = COALESCE(wallet_balance_paise, 0) + COALESCE(r.merchant_profit_paise, 0),
            total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + COALESCE(r.platform_cut_paise, 0)
        WHERE id = r.merchant_id;

        -- Merchant Transaction log
        INSERT INTO public.merchant_transactions (
            merchant_id, transaction_type, amount_paise, commission_paise, balance_after_paise, description
        ) VALUES (
            r.merchant_id, 'sale', COALESCE(r.merchant_profit_paise, 0), COALESCE(r.platform_cut_paise, 0),
            (SELECT wallet_balance_paise FROM public.merchants WHERE id = r.merchant_id),
            'Order #' || substring(r.id::text from 1 for 8) || ' profit settled (Manual Backfill)'
        );

        -- Platform Ledger
        INSERT INTO public.platform_ledger (
            transaction_id, entry_type, amount_paise, balance_after_paise, description
        ) VALUES (
            r.id, 'shopping_commission', COALESCE(r.platform_cut_paise, 0),
            (SELECT COALESCE(SUM(amount_paise), 0) FROM public.platform_ledger WHERE entry_type = 'shopping_commission') + COALESCE(r.platform_cut_paise, 0),
            'Shopping commission: Order #' || substring(r.id::text from 1 for 8) || ' (Backfill)'
        );

        -- Mark as settled
        UPDATE public.shopping_order_groups 
        SET settlement_status = 'settled' 
        WHERE id = r.id;
    END LOOP;

    -- Reset bypass flag
    PERFORM set_config('app.internal_bypass', 'false', true);
END $$;
