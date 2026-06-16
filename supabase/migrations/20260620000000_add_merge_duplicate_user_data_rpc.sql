-- 20260620000000_add_merge_duplicate_user_data_rpc.sql

CREATE OR REPLACE FUNCTION public.merge_duplicate_user_data(p_duplicate_id uuid, p_original_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Merge customer_wallets
    IF EXISTS (SELECT 1 FROM public.customer_wallets WHERE user_id = p_original_id) AND
       EXISTS (SELECT 1 FROM public.customer_wallets WHERE user_id = p_duplicate_id) THEN
        UPDATE public.customer_wallets
        SET balance_paise = balance_paise + (SELECT balance_paise FROM public.customer_wallets WHERE user_id = p_duplicate_id),
            updated_at = now()
        WHERE user_id = p_original_id;
        
        DELETE FROM public.customer_wallets WHERE user_id = p_duplicate_id;
    ELSE
        UPDATE public.customer_wallets
        SET user_id = p_original_id
        WHERE user_id = p_duplicate_id;
    END IF;

    -- 2. Merge reward_points_balance
    IF EXISTS (SELECT 1 FROM public.reward_points_balance WHERE user_id = p_original_id) AND
       EXISTS (SELECT 1 FROM public.reward_points_balance WHERE user_id = p_duplicate_id) THEN
        UPDATE public.reward_points_balance
        SET total_earned = total_earned + (SELECT total_earned FROM public.reward_points_balance WHERE user_id = p_duplicate_id),
            total_redeemed = total_redeemed + (SELECT total_redeemed FROM public.reward_points_balance WHERE user_id = p_duplicate_id),
            current_balance = current_balance + (SELECT current_balance FROM public.reward_points_balance WHERE user_id = p_duplicate_id),
            tree_size = tree_size + COALESCE((SELECT tree_size FROM public.reward_points_balance WHERE user_id = p_duplicate_id), 0),
            direct_referrals = direct_referrals + COALESCE((SELECT direct_referrals FROM public.reward_points_balance WHERE user_id = p_duplicate_id), 0),
            active_downline = active_downline + COALESCE((SELECT active_downline FROM public.reward_points_balance WHERE user_id = p_duplicate_id), 0),
            updated_at = now()
        WHERE user_id = p_original_id;
        
        DELETE FROM public.reward_points_balance WHERE user_id = p_duplicate_id;
    ELSE
        UPDATE public.reward_points_balance
        SET user_id = p_original_id
        WHERE user_id = p_duplicate_id;
    END IF;

    -- 3. Merchants
    IF EXISTS (SELECT 1 FROM public.merchants WHERE user_id = p_original_id) THEN
        DELETE FROM public.merchants WHERE user_id = p_duplicate_id;
    ELSE
        UPDATE public.merchants SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    END IF;

    -- 4. Merchant Wallets
    IF EXISTS (SELECT 1 FROM public.merchant_wallets WHERE user_id = p_original_id) THEN
        DELETE FROM public.merchant_wallets WHERE user_id = p_duplicate_id;
    ELSE
        UPDATE public.merchant_wallets SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    END IF;

    -- 5. Employees
    IF EXISTS (SELECT 1 FROM public.employees WHERE user_id = p_original_id) THEN
        DELETE FROM public.employees WHERE user_id = p_duplicate_id;
    ELSE
        UPDATE public.employees SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    END IF;

    -- 6. User Channel Bindings
    IF EXISTS (SELECT 1 FROM public.user_channel_bindings WHERE user_id = p_original_id) THEN
        DELETE FROM public.user_channel_bindings WHERE user_id = p_duplicate_id;
    ELSE
        UPDATE public.user_channel_bindings SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    END IF;

    -- 7. Admin Permissions
    IF EXISTS (SELECT 1 FROM public.admin_permissions WHERE admin_user_id = p_original_id) THEN
        DELETE FROM public.admin_permissions WHERE admin_user_id = p_duplicate_id;
    ELSE
        UPDATE public.admin_permissions SET admin_user_id = p_original_id WHERE admin_user_id = p_duplicate_id;
    END IF;

    -- 8. Reward Daily Caps
    IF EXISTS (SELECT 1 FROM public.reward_daily_caps WHERE user_id = p_original_id) THEN
        DELETE FROM public.reward_daily_caps WHERE user_id = p_duplicate_id;
    ELSE
        UPDATE public.reward_daily_caps SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    END IF;

    -- 9. User Wishlists (prevent unique constraint violations)
    DELETE FROM public.user_wishlists uw_dup
    WHERE user_id = p_duplicate_id
      AND EXISTS (
          SELECT 1 FROM public.user_wishlists uw_orig
          WHERE uw_orig.user_id = p_original_id
            AND uw_orig.product_id = uw_dup.product_id
      );
    UPDATE public.user_wishlists SET user_id = p_original_id WHERE user_id = p_duplicate_id;

    -- 10. Shopping Cart (merge quantity or repoint)
    UPDATE public.shopping_cart sc_orig
    SET quantity = sc_orig.quantity + sc_dup.quantity,
        updated_at = now()
    FROM public.shopping_cart sc_dup
    WHERE sc_orig.customer_id = p_original_id
      AND sc_dup.customer_id = p_duplicate_id
      AND sc_orig.inventory_id = sc_dup.inventory_id;

    DELETE FROM public.shopping_cart sc_dup
    WHERE customer_id = p_duplicate_id
      AND EXISTS (
          SELECT 1 FROM public.shopping_cart sc_orig
          WHERE sc_orig.customer_id = p_original_id
            AND sc_orig.inventory_id = sc_dup.inventory_id
      );
    UPDATE public.shopping_cart SET customer_id = p_original_id WHERE customer_id = p_duplicate_id;

    -- 11. Repoint references that reference user_profiles(id)
    UPDATE public.reward_distribution_log SET source_user_id = p_original_id WHERE source_user_id = p_duplicate_id;
    UPDATE public.reward_redemption_requests SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.udhari_requests SET customer_id = p_original_id WHERE customer_id = p_duplicate_id;
    UPDATE public.wallet_adjustment_logs SET admin_user_id = p_original_id WHERE admin_user_id = p_duplicate_id;
    UPDATE public.wallet_adjustment_logs SET target_user_id = p_original_id WHERE target_user_id = p_duplicate_id;
    UPDATE public.wallet_transactions SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.webchat_messages SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.attendance_logs SET employee_id = p_original_id WHERE employee_id = p_duplicate_id;
    DELETE FROM public.auth_tokens WHERE user_id = p_duplicate_id;
    UPDATE public.kyc_records SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.kyc_records SET reviewed_by = p_original_id WHERE reviewed_by = p_duplicate_id;
    UPDATE public.transactions SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.employee_documents SET employee_id = p_original_id WHERE employee_id = p_duplicate_id;
    UPDATE public.leave_balances SET employee_id = p_original_id WHERE employee_id = p_duplicate_id;
    UPDATE public.kyc_audit_logs SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.payout_pii_access_log SET admin_user_id = p_original_id WHERE admin_user_id = p_duplicate_id;
    UPDATE public.attendance SET employee_id = p_original_id WHERE employee_id = p_duplicate_id;
    UPDATE public.career_applications SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.customer_wallet_transactions SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.lead_interactions SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.leave_requests SET employee_id = p_original_id WHERE employee_id = p_duplicate_id;
    UPDATE public.merchant_ratings SET customer_id = p_original_id WHERE customer_id = p_duplicate_id;
    UPDATE public.nfc_orders SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.notifications SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.webchat_sessions SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.orders SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.payout_requests SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.reward_transactions SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.reward_transactions SET source_user_id = p_original_id WHERE source_user_id = p_duplicate_id;
    UPDATE public.salary_records SET employee_id = p_original_id WHERE employee_id = p_duplicate_id;
    UPDATE public.whatsapp_message_logs SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.shopping_order_groups SET customer_id = p_original_id WHERE customer_id = p_duplicate_id;
    UPDATE public.solar_leads SET user_id = p_original_id WHERE user_id = p_duplicate_id;
    UPDATE public.admin_tasks SET assigned_to = p_original_id WHERE assigned_to = p_duplicate_id;
    UPDATE public.admin_tasks SET assigned_by = p_original_id WHERE assigned_by = p_duplicate_id;
    UPDATE public.crm_tasks SET assigned_to = p_original_id WHERE assigned_to = p_duplicate_id;
    UPDATE public.platform_procurement_orders SET created_by_admin = p_original_id WHERE created_by_admin = p_duplicate_id;

    -- 12. Repoint all references that point directly to auth.users(id)
    UPDATE public.crm_leads SET assigned_to = p_original_id WHERE assigned_to = p_duplicate_id;
    UPDATE public.crm_leads SET created_by = p_original_id WHERE created_by = p_duplicate_id;
    UPDATE public.employees SET reporting_manager_id = p_original_id WHERE reporting_manager_id = p_duplicate_id;
    UPDATE public.flash_sale_items SET created_by = p_original_id WHERE created_by = p_duplicate_id;
    UPDATE public.kyc_records SET verified_by = p_original_id WHERE verified_by = p_duplicate_id;
    UPDATE public.merchant_investments SET admin_id = p_original_id WHERE admin_id = p_duplicate_id;
    UPDATE public.merchant_lockin_balances SET admin_id = p_original_id WHERE admin_id = p_duplicate_id;
    UPDATE public.payout_request_events SET actor_id = p_original_id WHERE actor_id = p_duplicate_id;
    UPDATE public.payout_requests SET approved_by = p_original_id WHERE approved_by = p_duplicate_id;
    UPDATE public.payout_requests SET rejected_by = p_original_id WHERE rejected_by = p_duplicate_id;
    UPDATE public.payout_requests SET released_by = p_original_id WHERE released_by = p_duplicate_id;
    UPDATE public.payout_requests SET reviewed_by = p_original_id WHERE reviewed_by = p_duplicate_id;
    UPDATE public.reward_configuration SET created_by = p_original_id WHERE created_by = p_duplicate_id;
    UPDATE public.reward_configuration_history SET changed_by = p_original_id WHERE changed_by = p_duplicate_id;
    UPDATE public.reward_redemption_requests SET processed_by = p_original_id WHERE processed_by = p_duplicate_id;
    UPDATE public.shopping_order_groups SET assigned_to = p_original_id WHERE assigned_to = p_duplicate_id;
    UPDATE public.shopping_order_groups SET status_updated_by = p_original_id WHERE status_updated_by = p_duplicate_id;
    UPDATE public.shopping_products SET reviewed_by = p_original_id WHERE reviewed_by = p_duplicate_id;
    UPDATE public.training_materials SET created_by = p_original_id WHERE created_by = p_duplicate_id;
    UPDATE public.user_profiles SET referred_by = p_original_id WHERE referred_by = p_duplicate_id;
    UPDATE public.user_profiles SET reward_parent_id = p_original_id WHERE reward_parent_id = p_duplicate_id;

    -- 13. Finally delete the user profile for the duplicate
    DELETE FROM public.user_profiles WHERE id = p_duplicate_id;
END;
$$;
