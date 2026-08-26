-- ============================================================================
-- MIGRATION: 20260820000001_allow_hr_manager_termination.sql
--
-- PURPOSE:
--   Allow hr_manager to terminate employees. The initial implementation restricted
--   termination to only admin and super_admin, causing the HR team to get
--   unauthorized errors when trying to terminate employees from the HRM panel.
-- ============================================================================

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

    -- 2. Verify caller is admin, super_admin, or hr_manager
    SELECT role::text INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin', 'hr_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: HR or Admin access required to terminate employees');
    END IF;

    -- 3. Verify target employee exists
    SELECT role::text INTO v_emp_role
    FROM public.user_profiles
    WHERE id = p_employee_id;

    IF v_emp_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Employee not found');
    END IF;

    -- 4. Prevent terminating admins/super_admins
    IF v_emp_role IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot terminate admin or super_admin accounts');
    END IF;
    
    -- Prevent hr_manager from terminating another hr_manager
    IF v_caller_role = 'hr_manager' AND v_emp_role = 'hr_manager' THEN
        RETURN jsonb_build_object('success', false, 'error', 'HR Managers cannot terminate other HR Managers');
    END IF;

    -- 5. Prevent self-termination
    IF v_caller_id = p_employee_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot terminate your own account');
    END IF;

    -- 6. Suspend the user (revokes access, sets is_suspended=TRUE)
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
