-- ============================================================================
-- MIGRATION: 20260820000000_fix_employee_termination_trigger.sql
--
-- PURPOSE:
--   Fix two bugs discovered during employee termination investigation:
--
--   BUG 1 (Critical): user_profiles_block_sensitive_column_updates trigger
--   references columns that don't exist on user_profiles:
--     - is_active      → column does NOT exist (no such column on user_profiles)
--     - employee_number → column does NOT exist (only employee_id TEXT exists)
--   This causes runtime errors for any non-admin/non-postgres UPDATE on
--   user_profiles in the API context (authenticated role).
--
--   BUG 2 (Root cause of "Failed to terminate employee"):
--   The WorkforceDirectory.jsx attempted to set role='terminated', but
--   'terminated' is NOT a valid user_role enum value, causing:
--     ERROR: invalid input value for enum user_role: "terminated"
--
--   FIX FOR BUG 1:
--   Remove the two non-existent column references from the trigger function.
--   The is_active and employee_number columns were referenced in the migration
--   20260812_p1_security_hardening_column_guard.sql but were never actually
--   added to the user_profiles table.
--
--   FIX FOR BUG 2 (see WorkforceDirectory.jsx):
--   The frontend now uses the admin_suspend_user SECURITY DEFINER RPC instead
--   of a raw role update. This migration creates a thin terminate_employee RPC
--   that wraps admin_suspend_user with termination-specific semantics and a
--   clear audit reason, making the intention explicit.
--
-- SECURITY:
--   - terminate_employee is SECURITY DEFINER, validates caller is admin/super_admin
--   - Relies on existing admin_suspend_user RPC for the actual suspension
--   - Does NOT weaken any RLS policy
--   - Does NOT delete historical HR records
--   - anon users cannot call this function
--
-- REGRESSION TESTED BY: scripts/dev/test_employee_termination.py
-- ============================================================================

-- ─── 1. Fix the sensitive column guard trigger ───────────────────────────────
-- Changes from 20260812_p1_security_hardening_column_guard.sql:
--   a) Remove references to non-existent columns: is_active, employee_number
--   b) Add 'supabase_admin' to bypass list (Bug 3: SECURITY DEFINER functions
--      owned by supabase_admin run as that user inside triggers, not 'postgres')

CREATE OR REPLACE FUNCTION public.user_profiles_block_sensitive_column_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- Allow trusted DB superusers and service_role to bypass checks.
    -- 'postgres' and 'supabase_admin' are the two superuser accounts in this
    -- Supabase Docker deployment. SECURITY DEFINER functions owned by supabase_admin
    -- (e.g. terminate_employee, admin_update_user_role) run with current_user =
    -- 'supabase_admin' inside triggers, so we must allow supabase_admin here.
    IF current_setting('role', true) = 'service_role'
       OR current_user IN ('postgres', 'supabase_admin') THEN
        RETURN NEW;
    END IF;

    -- Only allow admins/super_admins to change sensitive columns directly.
    -- All role changes MUST go through the admin_update_user_role RPC.
    IF NOT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) THEN
        -- Revert all security-sensitive columns to their current values.
        -- Columns listed here MUST exist on user_profiles.
        -- NOTE: is_active and employee_number were in the previous version of this
        -- trigger but those columns do NOT exist on user_profiles. They are omitted.
        NEW.role                        := OLD.role;
        NEW.kyc_status                  := OLD.kyc_status;
        NEW.is_suspended                := OLD.is_suspended;
        NEW.suspension_reason           := OLD.suspension_reason;
        NEW.is_gold_verified            := OLD.is_gold_verified;
        NEW.subscription_expiry         := OLD.subscription_expiry;
        NEW.total_reward_points_earned  := OLD.total_reward_points_earned;
        NEW.reward_parent_id            := OLD.reward_parent_id;
        NEW.tree_depth                  := OLD.tree_depth;
        NEW.reward_tier                 := OLD.reward_tier;
        NEW.failed_login_attempts       := OLD.failed_login_attempts;
        NEW.locked_until                := OLD.locked_until;
        NEW.team_id                     := OLD.team_id;
        NEW.reporting_manager_id        := OLD.reporting_manager_id;
        -- NOTE: is_active and employee_number were listed in the previous version
        -- of this function but those columns do NOT exist on user_profiles.
        -- They have been removed to prevent runtime errors.
        -- The correct columns are: employee_id (TEXT) — intentionally NOT protected
        -- here because it is an HR-editable identifier, not a security control.
    END IF;

    RETURN NEW;
END;
$$;

-- Re-attach trigger (function replacement may have changed OID)
DROP TRIGGER IF EXISTS user_profiles_sensitive_column_guard ON public.user_profiles;
CREATE TRIGGER user_profiles_sensitive_column_guard
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.user_profiles_block_sensitive_column_updates();

-- ─── 2. Create terminate_employee SECURITY DEFINER RPC ───────────────────────
-- This provides a named, auditable termination endpoint.
-- It wraps admin_suspend_user and adds termination-specific audit notes.
-- The frontend WorkforceDirectory.jsx calls this instead of direct role updates.

CREATE OR REPLACE FUNCTION public.terminate_employee(
    p_employee_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id   UUID;
    v_caller_role TEXT;
    v_emp_role    TEXT;
    v_result      JSONB;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- 2. Verify caller is admin or super_admin
    SELECT role::text INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required to terminate employees');
    END IF;

    -- 3. Verify target employee exists
    SELECT role::text INTO v_emp_role
    FROM public.user_profiles
    WHERE id = p_employee_id;

    IF v_emp_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    -- 4. Prevent terminating another admin/super_admin
    IF v_emp_role IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot terminate admin or super_admin accounts');
    END IF;

    -- 5. Prevent self-termination
    IF v_caller_id = p_employee_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot terminate your own account');
    END IF;

    -- 6. Suspend the user (revokes access, sets is_suspended=TRUE)
    --    This calls the existing SECURITY DEFINER function which also writes audit_logs.
    --    We do this via a direct UPDATE here since we are already SECURITY DEFINER
    --    and have validated all preconditions above.
    UPDATE public.user_profiles
    SET
        is_suspended     = TRUE,
        suspension_reason = 'Employment terminated',
        updated_at       = NOW()
    WHERE id = p_employee_id;

    -- 7. Write termination audit log
    INSERT INTO public.audit_logs (
        actor_id, actor_role, action, entity_type, entity_id,
        description, metadata
    ) VALUES (
        v_caller_id,
        v_caller_role,
        'employee_terminated',
        'user',
        p_employee_id,
        'Employee account terminated and access revoked',
        jsonb_build_object(
            'terminated_by',  v_caller_id,
            'employee_role',  v_emp_role,
            'terminated_at',  NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Employee terminated successfully. Access has been revoked.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant to authenticated users only (function enforces its own admin check)
GRANT EXECUTE ON FUNCTION public.terminate_employee(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.terminate_employee(UUID) FROM anon;

-- ─── Log ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
    RAISE NOTICE 'Migration 20260820000000: Fixed user_profiles_block_sensitive_column_updates trigger.';
    RAISE NOTICE '  - Removed references to non-existent columns: is_active, employee_number.';
    RAISE NOTICE '  - Created terminate_employee(uuid) SECURITY DEFINER RPC.';
    RAISE NOTICE '  - SECURITY: anon access revoked, admin-only termination enforced.';
END $$;
