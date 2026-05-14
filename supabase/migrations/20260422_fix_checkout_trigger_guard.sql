-- ============================================================
-- Hotfix: order_groups_merchant_update_guard
-- Description:
--   Specifically target the 'merchant' role for financial column
--   restrictions. Allow 'user' (customers) and admins to proceed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.order_groups_merchant_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
    user_role text;
BEGIN
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
$function$;
