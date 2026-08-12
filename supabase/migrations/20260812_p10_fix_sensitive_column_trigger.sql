-- ============================================================================
-- MIGRATION: 20260812_p10_fix_sensitive_column_trigger.sql
--
-- PURPOSE:
--   Fix the user_profiles_block_sensitive_column_updates trigger which was
--   failing due to referencing non-existent columns (is_active and employee_number),
--   causing a 400 Bad Request error on all profile updates for normal users.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION user_profiles_block_sensitive_column_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow service_role or postgres to bypass checks
    IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    -- Only allow admins/super_admins to change sensitive columns
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        NEW.role := OLD.role;
        NEW.kyc_status := OLD.kyc_status;
        NEW.is_suspended := OLD.is_suspended;
        NEW.suspension_reason := OLD.suspension_reason;
        NEW.is_gold_verified := OLD.is_gold_verified;
        NEW.subscription_expiry := OLD.subscription_expiry;
        NEW.total_reward_points_earned := OLD.total_reward_points_earned;
        NEW.reward_parent_id := OLD.reward_parent_id;
        NEW.tree_depth := OLD.tree_depth;
        NEW.reward_tier := OLD.reward_tier;
        NEW.failed_login_attempts := OLD.failed_login_attempts;
        NEW.locked_until := OLD.locked_until;
        NEW.team_id := OLD.team_id;
        NEW.reporting_manager_id := OLD.reporting_manager_id;
        NEW.employee_id := OLD.employee_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
