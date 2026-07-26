-- ============================================================
-- Admin Lead Assignment & User Role Management
-- 1. SECURITY DEFINER RPC: admin_update_user_role
-- 2. SECURITY DEFINER RPC: admin_reassign_lead
-- ============================================================

-- ============================================================
-- 1. admin_update_user_role
--    • Caller must be admin or super_admin
--    • Only super_admin can grant super_admin
--    • Self-lockout guard: cannot remove own admin/super_admin
--    • Syncs auth.users.raw_user_meta_data.role for JWT consistency
--    • Audit trail in audit_logs_crm
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_role(
    p_target_user_id UUID,
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_old_role TEXT;
    v_valid_roles TEXT[] := ARRAY[
        'customer', 'merchant', 'admin', 'super_admin',
        'hr_manager', 'sales_exec', 'sales_manager', 'employee'
    ];
BEGIN
    -- 1. Identify caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- 2. Verify caller is admin/super_admin
    SELECT role::text INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;

    -- 3. Validate new role
    IF NOT (p_new_role = ANY(v_valid_roles)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role: ' || p_new_role);
    END IF;

    -- 4. Only super_admin can grant super_admin
    IF p_new_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can grant super_admin role');
    END IF;

    -- 5. Self-lockout guard: cannot remove own admin/super_admin
    IF v_caller_id = p_target_user_id AND p_new_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot remove your own admin privileges');
    END IF;

    -- 6. Get old role for audit
    SELECT role::text INTO v_old_role
    FROM public.user_profiles
    WHERE id = p_target_user_id;

    IF v_old_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
    END IF;

    -- 7. No-op guard
    IF v_old_role = p_new_role THEN
        RETURN jsonb_build_object('success', true, 'message', 'Role unchanged');
    END IF;

    -- 8. Update user_profiles.role
    UPDATE public.user_profiles
    SET role = p_new_role::user_role,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- 9. Sync auth.users.raw_user_meta_data.role for JWT consistency
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_new_role),
        updated_at = NOW()
    WHERE id = p_target_user_id;

    -- 10. Audit trail
    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id,
        'ROLE_CHANGE',
        'user_profiles',
        p_target_user_id,
        jsonb_build_object('role', v_old_role),
        jsonb_build_object('role', p_new_role)
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Role updated from ' || v_old_role || ' to ' || p_new_role
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ============================================================
-- 2. admin_reassign_lead
--    • Caller must be admin, super_admin, or sales_manager
--    • Validates target rep exists and has a sales-related role
--    • NULL p_new_rep_id = unassign
--    • Creates audit trail in crm_lead_activities
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_reassign_lead(
    p_lead_id UUID,
    p_new_rep_id UUID  -- NULL to unassign
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_old_rep_id UUID;
    v_rep_role TEXT;
    v_lead_exists BOOLEAN;
BEGIN
    -- 1. Identify caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- 2. Verify caller is admin/super_admin/sales_manager
    SELECT role::text INTO v_caller_role
    FROM public.user_profiles
    WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin', 'sales_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin or Sales Manager access required');
    END IF;

    -- 3. Verify lead exists and is not archived
    SELECT assigned_to INTO v_old_rep_id
    FROM public.crm_leads
    WHERE id = p_lead_id AND archived_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead not found or archived');
    END IF;

    -- 4. If assigning (not unassigning), validate the rep
    IF p_new_rep_id IS NOT NULL THEN
        SELECT role::text INTO v_rep_role
        FROM public.user_profiles
        WHERE id = p_new_rep_id;

        IF v_rep_role IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Target representative not found');
        END IF;

        IF v_rep_role NOT IN ('sales_exec', 'sales_manager', 'admin', 'super_admin') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Target user is not a sales representative');
        END IF;
    END IF;

    -- 5. No-op guard
    IF v_old_rep_id IS NOT DISTINCT FROM p_new_rep_id THEN
        RETURN jsonb_build_object('success', true, 'message', 'Assignment unchanged');
    END IF;

    -- 6. Update lead assignment
    UPDATE public.crm_leads
    SET assigned_to = p_new_rep_id,
        updated_at = NOW()
    WHERE id = p_lead_id;

    -- 7. Audit trail in crm_lead_activities
    INSERT INTO public.crm_lead_activities (lead_id, actor_id, action_type, metadata)
    VALUES (
        p_lead_id,
        v_caller_id,
        'assignment_change',
        jsonb_build_object(
            'old_rep_id', v_old_rep_id,
            'new_rep_id', p_new_rep_id,
            'changed_by', v_caller_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', CASE
            WHEN p_new_rep_id IS NULL THEN 'Lead unassigned'
            ELSE 'Lead reassigned successfully'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute to authenticated users (RPCs handle their own auth checks internally)
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_lead(UUID, UUID) TO authenticated;
