-- ============================================================
-- Migration: 20260415_harden_and_fix_settlement_v3
-- Description:
--   1. Hardens update_order_delivery_v3 by using user_profiles (admin/super_admin)
--      and merchant.user_id join for authorization.
--   2. Restores settlement logic (Merchant gets 70% profit if approved).
--   3. Clarifies transaction descriptions: 30% commission = 70% merchant share.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_order_delivery_v3(
    p_order_id      uuid,
    p_new_status    text,
    p_tracking_number text,
    p_estimated_at  timestamptz,
    p_status_notes  text,
    p_is_admin      boolean DEFAULT false,
    p_is_merchant   boolean DEFAULT false,
    p_is_customer   boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order       RECORD;
    v_user_id     uuid;
    v_caller_role text;
BEGIN
    v_user_id := auth.uid();

    -- Verify the order exists
    SELECT * INTO v_order
    FROM public.shopping_order_groups
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Authorization checks
    IF p_is_admin THEN
        -- Standardized Admin check via user_profiles
        SELECT role INTO v_caller_role
        FROM public.user_profiles
        WHERE id = v_user_id;

        IF v_caller_role NOT IN ('admin', 'super_admin') THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
        END IF;

    ELSIF p_is_merchant THEN
        -- Merchant check: Must own the order linked via merchants table
        IF v_order.merchant_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.merchants
                WHERE id = v_order.merchant_id AND user_id = v_user_id
            ) THEN
                RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
            END IF;
        END IF;

    ELSIF p_is_customer THEN
        IF v_order.customer_id != v_user_id THEN
            RETURN json_build_object('success', false, 'message', 'Unauthorized: Access denied');
        END IF;

    ELSE
        RETURN json_build_object('success', false, 'message', 'Unauthorized: Missing role flag');
    END IF;

    -- Apply status update
    UPDATE public.shopping_order_groups
    SET delivery_status      = p_new_status,
        tracking_number      = p_tracking_number,
        estimated_delivery_at = p_estimated_at,
        status_notes         = p_status_notes,
        updated_at           = NOW()
    WHERE id = p_order_id;

    -- SETTLEMENT LOGIC: When merchant transitions from 'pending' to fulfillment state
    -- Normal condition: Merchant keeps 70% profit (30% platform commission).
    IF v_order.delivery_status = 'pending' 
       AND p_new_status IN ('packed', 'shipped', 'delivered') 
       AND v_order.settlement_status = 'pending' 
       AND p_is_merchant = true THEN
       
       -- Credit the merchant wallet (Cost recovery + 70% share of Profit)
       UPDATE public.merchants 
       SET wallet_balance_paise        = COALESCE(wallet_balance_paise, 0)        + COALESCE(v_order.merchant_profit_paise, 0),
           total_commission_paid_paise = COALESCE(total_commission_paid_paise, 0) + COALESCE(v_order.platform_cut_paise, 0),
           updated_at = NOW()
       WHERE id = v_order.merchant_id;

       -- Insert merchant transaction log with clear text
       INSERT INTO public.merchant_transactions (
           merchant_id, 
           transaction_type, 
           amount_paise, 
           commission_paise, 
           balance_after_paise, 
           description
       ) VALUES (
           v_order.merchant_id, 
           'sale', 
           COALESCE(v_order.merchant_profit_paise, 0), 
           COALESCE(v_order.platform_cut_paise, 0),
           (SELECT wallet_balance_paise FROM public.merchants WHERE id = v_order.merchant_id),
           'Order #' || substring(p_order_id::text from 1 for 8) || ' profit settled (Merchant kept 70% profit share).'
       );

       -- Update settlement_status on the group
       UPDATE public.shopping_order_groups 
       SET settlement_status = 'settled',
           updated_at = NOW() 
       WHERE id = p_order_id;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Order delivery info updated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
