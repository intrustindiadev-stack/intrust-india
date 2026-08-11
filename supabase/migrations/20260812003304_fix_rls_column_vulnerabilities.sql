-- Fix critical RLS vulnerabilities across user_profiles, transactions, and reward_transactions

-- 1. Protect user_profiles sensitive columns
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
        -- Revert sensitive columns to their OLD values
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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS user_profiles_sensitive_column_guard ON public.user_profiles;
CREATE TRIGGER user_profiles_sensitive_column_guard
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION user_profiles_block_sensitive_column_updates();

-- 2. Drop vulnerable RLS policy on transactions
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.webchat_sessions;
DROP POLICY IF EXISTS "Users can update their own session" ON public.webchat_sessions;


-- 3. Drop vulnerable RLS policy on reward_transactions
DROP POLICY IF EXISTS "Users can update own is_scratched" ON public.reward_transactions;
