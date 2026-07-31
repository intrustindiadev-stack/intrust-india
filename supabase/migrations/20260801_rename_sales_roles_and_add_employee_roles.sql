-- ============================================================
-- Role System Overhaul
-- Date: 2026-08-01
--
-- Changes:
--   1. Add new enum values: relationship_exec, relationship_manager
--      + 6 new employee specialisation roles
--   2. Migrate existing data: sales_manager → relationship_manager
--      (sales_exec had 0 live users, still renamed structurally)
--   3. Sync auth.users.raw_user_meta_data for JWT consistency
--   4. Update all RLS policies that referenced old names
--   5. Update admin RPCs: admin_update_user_role, admin_reassign_lead,
--      admin_add_team_member
-- ============================================================

-- ── Step 1: Add new ENUM values ────────────────────────────
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'relationship_exec';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'relationship_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'freelancer';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'video_editor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'social_media_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'seo_specialist';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'advertiser';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'support_agent';

-- ── Step 2: Migrate existing data ─────────────────────────
-- sales_manager → relationship_manager (3 live users)
UPDATE public.user_profiles
SET role = 'relationship_manager'::user_role,
    updated_at = NOW()
WHERE role = 'sales_manager';

-- sales_exec → relationship_exec (0 live users, structural only)
UPDATE public.user_profiles
SET role = 'relationship_exec'::user_role,
    updated_at = NOW()
WHERE role = 'sales_exec';

-- ── Step 3: Sync auth.users raw_user_meta_data for JWT ────
-- This ensures the JWT role claim is correct for existing sessions
UPDATE auth.users u
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'relationship_manager'),
    updated_at = NOW()
WHERE u.id IN (
    SELECT id FROM public.user_profiles WHERE role = 'relationship_manager'
);

UPDATE auth.users u
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', 'relationship_exec'),
    updated_at = NOW()
WHERE u.id IN (
    SELECT id FROM public.user_profiles WHERE role = 'relationship_exec'
);

-- ── Step 4: Update CRM RLS Policies ───────────────────────

-- crm_leads
DROP POLICY IF EXISTS "Sales can view their own leads, Managers/Admins can view all" ON public.crm_leads;
CREATE POLICY "RM can view their own leads, Managers/Admins can view all"
    ON public.crm_leads FOR SELECT
    USING (
        auth.uid() = assigned_to OR
        auth.uid() = created_by OR
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
            IN ('relationship_manager', 'admin', 'super_admin')
    );

DROP POLICY IF EXISTS "Sales can insert leads" ON public.crm_leads;
CREATE POLICY "RM can insert leads"
    ON public.crm_leads FOR INSERT
    WITH CHECK (
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
            IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin')
    );

DROP POLICY IF EXISTS "Sales can update their own leads, Managers/Admins can update all" ON public.crm_leads;
CREATE POLICY "RM can update their own leads, Managers/Admins can update all"
    ON public.crm_leads FOR UPDATE
    USING (
        auth.uid() = assigned_to OR
        auth.uid() = created_by OR
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
            IN ('relationship_manager', 'admin', 'super_admin')
    );

-- crm_lead_notes
DROP POLICY IF EXISTS "Sales can view notes on their leads, Managers/Admins can view all" ON public.crm_lead_notes;
CREATE POLICY "RM can view notes on their leads, Managers/Admins can view all"
    ON public.crm_lead_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR
                l.created_by = auth.uid() OR
                (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                    IN ('relationship_manager', 'admin', 'super_admin')
            )
        )
    );

DROP POLICY IF EXISTS "Sales can add notes to their leads" ON public.crm_lead_notes;
CREATE POLICY "RM can add notes to their leads"
    ON public.crm_lead_notes FOR INSERT
    WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR
                l.created_by = auth.uid() OR
                (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                    IN ('relationship_manager', 'admin', 'super_admin')
            )
        )
    );

-- crm_lead_activities
DROP POLICY IF EXISTS "Sales can view activities on their leads, Managers/Admins can view all" ON public.crm_lead_activities;
CREATE POLICY "RM can view activities on their leads, Managers/Admins can view all"
    ON public.crm_lead_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads l
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR
                l.created_by = auth.uid() OR
                (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                    IN ('relationship_manager', 'admin', 'super_admin')
            )
        )
    );

DROP POLICY IF EXISTS "System/Sales can insert activities" ON public.crm_lead_activities;
CREATE POLICY "System/RM can insert activities"
    ON public.crm_lead_activities FOR INSERT
    WITH CHECK (
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
            IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin')
    );

-- ── Step 5: Update team_members RLS ───────────────────────
DROP POLICY IF EXISTS "team_members_write_admin_manager" ON public.team_members;
CREATE POLICY "team_members_write_admin_manager" ON public.team_members
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid())
            IN ('admin', 'super_admin', 'relationship_manager')
    );

-- ── Step 6: Update admin_update_user_role RPC ─────────────
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
    v_caller_id   UUID;
    v_caller_role TEXT;
    v_old_role    TEXT;
    v_valid_roles TEXT[] := ARRAY[
        'customer', 'merchant', 'admin', 'super_admin',
        'hr_manager', 'employee',
        'relationship_exec', 'relationship_manager',
        'freelancer', 'video_editor', 'social_media_manager',
        'seo_specialist', 'advertiser', 'support_agent'
    ];
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role
    FROM public.user_profiles WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;

    IF NOT (p_new_role = ANY(v_valid_roles)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role: ' || p_new_role);
    END IF;

    IF p_new_role = 'super_admin' AND v_caller_role != 'super_admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only super_admin can grant super_admin role');
    END IF;

    IF v_caller_id = p_target_user_id AND p_new_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot remove your own admin privileges');
    END IF;

    SELECT role::text INTO v_old_role
    FROM public.user_profiles WHERE id = p_target_user_id;

    IF v_old_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target user not found');
    END IF;

    IF v_old_role = p_new_role THEN
        RETURN jsonb_build_object('success', true, 'message', 'Role unchanged');
    END IF;

    UPDATE public.user_profiles
    SET role = p_new_role::user_role,
        updated_at = NOW()
    WHERE id = p_target_user_id;

    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', p_new_role),
        updated_at = NOW()
    WHERE id = p_target_user_id;

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

-- ── Step 7: Update admin_reassign_lead RPC ────────────────
CREATE OR REPLACE FUNCTION public.admin_reassign_lead(
    p_lead_id    UUID,
    p_new_rep_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id    UUID;
    v_caller_role  TEXT;
    v_old_rep_id   UUID;
    v_rep_role     TEXT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role
    FROM public.user_profiles WHERE id = v_caller_id;

    IF v_caller_role NOT IN ('admin', 'super_admin', 'relationship_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin or Relationship Manager access required');
    END IF;

    SELECT assigned_to INTO v_old_rep_id
    FROM public.crm_leads
    WHERE id = p_lead_id AND archived_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Lead not found or archived');
    END IF;

    IF p_new_rep_id IS NOT NULL THEN
        SELECT role::text INTO v_rep_role
        FROM public.user_profiles WHERE id = p_new_rep_id;

        IF v_rep_role IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Target representative not found');
        END IF;

        IF v_rep_role NOT IN ('relationship_exec', 'relationship_manager', 'admin', 'super_admin') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Target user is not a relationship representative');
        END IF;
    END IF;

    IF v_old_rep_id IS NOT DISTINCT FROM p_new_rep_id THEN
        RETURN jsonb_build_object('success', true, 'message', 'Assignment unchanged');
    END IF;

    UPDATE public.crm_leads
    SET assigned_to = p_new_rep_id,
        updated_at  = NOW()
    WHERE id = p_lead_id;

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

-- ── Step 8: Update admin_add_team_member RPC ──────────────
CREATE OR REPLACE FUNCTION public.admin_add_team_member(
    p_team_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id   UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
    v_old_team_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'relationship_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access');
    END IF;

    SELECT role::text, team_id INTO v_target_role, v_old_team_id
    FROM public.user_profiles WHERE id = p_user_id;

    IF v_target_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Allow all employee-type roles plus CRM roles into teams
    IF v_target_role NOT IN (
        'relationship_exec', 'relationship_manager',
        'employee', 'freelancer', 'video_editor', 'social_media_manager',
        'seo_specialist', 'advertiser', 'support_agent',
        'hr_manager', 'admin', 'super_admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'User role cannot be assigned to a team');
    END IF;

    INSERT INTO public.team_members (team_id, user_id)
    VALUES (p_team_id, p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET team_id = p_team_id, joined_at = NOW();

    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id,
        'ASSIGN_TEAM_MEMBER',
        'team_members',
        p_user_id,
        jsonb_build_object('old_team_id', v_old_team_id),
        jsonb_build_object('new_team_id', p_team_id, 'user_id', p_user_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'User assigned to team successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── Step 9: Re-grant execute permissions ──────────────────
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_lead(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_team_member(UUID, UUID) TO authenticated;

-- ── Verification query (run manually to confirm) ──────────
-- SELECT role, COUNT(*) FROM public.user_profiles GROUP BY role ORDER BY count DESC;
