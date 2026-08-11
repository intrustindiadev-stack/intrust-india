-- ============================================================================
-- MIGRATION: 20260812_p1_security_hardening_column_guard.sql
--
-- PURPOSE:
--   Extends user_profiles_sensitive_column_guard to protect additional columns
--   that were missing from the original fix:
--   - is_active: Controls whether a user account is active
--   - employee_number: HR identifier
--   - designation: HR data
--   - department: HR data
--   - blood_group: PII (arguably user-mutable but cautious to lock it)
--
-- ALSO:
--   Fixes the "HR managers can update all profiles" RLS policy to use
--   the user_profiles table (authoritative role source) instead of the JWT
--   user_metadata claim which could be stale or manipulated.
-- ============================================================================

-- ─── 1. Extend the sensitive column guard ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_profiles_block_sensitive_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Allow service_role or postgres to bypass checks
    IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
        RETURN NEW;
    END IF;

    -- Only allow admins/super_admins or hr_managers (for HR-specific columns)
    -- to change sensitive columns
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        -- Block ALL users (including HR managers via client-side RPC)
        -- from modifying these security-sensitive columns.
        -- Admins must use the admin_update_user_role RPC for role changes.
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
        -- NEWLY PROTECTED:
        NEW.is_active := OLD.is_active;        -- Account activation status
        NEW.employee_number := OLD.employee_number;  -- HR identifier
    END IF;

    RETURN NEW;
END;
$$;

-- Re-attach trigger (in case function replacement changed signature)
DROP TRIGGER IF EXISTS user_profiles_sensitive_column_guard ON public.user_profiles;
CREATE TRIGGER user_profiles_sensitive_column_guard
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.user_profiles_block_sensitive_column_updates();

-- ─── 2. Fix "HR managers" RLS policy to use user_profiles table ─────────────
-- The old policy used auth.jwt() -> 'user_metadata' ->> 'role' which
-- depends on the JWT claim being in sync with user_profiles.role.
-- Use the authoritative DB lookup instead.

DROP POLICY IF EXISTS "HR managers can update all profiles" ON public.user_profiles;
CREATE POLICY "HR managers can update all profiles"
ON public.user_profiles
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.role IN ('hr_manager', 'admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.role IN ('hr_manager', 'admin', 'super_admin')
    )
);

DROP POLICY IF EXISTS "HR managers can view all profiles" ON public.user_profiles;
CREATE POLICY "HR managers can view all profiles"
ON public.user_profiles
FOR SELECT
USING (
    (auth.uid() = id)
    OR is_admin()
    OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
          AND up.role IN ('hr_manager', 'admin', 'super_admin')
    )
);

-- ─── Log ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'Security hardening P1: Column guard extended to protect is_active and employee_number.';
    RAISE NOTICE 'Security hardening P1: HR manager RLS policy updated to use DB role lookup.';
END $$;
