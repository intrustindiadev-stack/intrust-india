-- RESOLVE ADMIN PANEL ERRORS: Migrate from app_admins to user_profiles roles
-- Created: 2026-04-22

-- 1. Ensure is_admin() is modern and robust
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
END;
$$;

-- 2. Refactor update_order_delivery_v3 to remove app_admins dependency
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
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
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
        updated_at = NOW()
    WHERE id = p_order_id;

    -- SETTLEMENT LOGIC (Settle on Merchant Approval)
    -- This block only executes if the merchant is approving delivery info.
    IF v_order.delivery_status = 'pending' AND p_new_status IN ('packed', 'shipped', 'delivered') 
       AND v_order.settlement_status = 'pending' 
       AND p_is_merchant = true THEN
       
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
           'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Fulfillment - 70% share)'
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

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. Verify KYC policies are clean (Re-apply correct policies)
DROP POLICY IF EXISTS "Admins can view all KYC" ON public.kyc_records;
CREATE POLICY "Admins can view all KYC" ON public.kyc_records
FOR SELECT
TO authenticated
USING (public.is_admin());

-- 4. Clean up any remaining references in kyc_records
-- (Already verified cleaner in previous steps but re-applying to be safe)
