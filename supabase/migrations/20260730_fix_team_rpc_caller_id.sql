-- ============================================================
-- Fix Team Management RPCs: add p_caller_id parameter
--
-- Root cause: When these RPCs are called from Next.js API routes
-- using the service-role key, auth.uid() returns NULL because
-- the service role bypasses Supabase Auth context.
-- Fix: each RPC now accepts p_caller_id UUID DEFAULT NULL and
-- uses COALESCE(p_caller_id, auth.uid()) to resolve the caller.
-- ============================================================

-- 1. admin_create_team
CREATE OR REPLACE FUNCTION public.admin_create_team(
    p_name TEXT,
    p_region_level TEXT,
    p_description TEXT DEFAULT NULL,
    p_state TEXT DEFAULT 'Madhya Pradesh',
    p_city TEXT DEFAULT NULL,
    p_area TEXT DEFAULT NULL,
    p_parent_team_id UUID DEFAULT NULL,
    p_team_lead_id UUID DEFAULT NULL,
    p_color TEXT DEFAULT '#6366f1',
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_new_team_id UUID;
BEGIN
    v_caller_id := COALESCE(p_caller_id, auth.uid());
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;

    IF p_region_level NOT IN ('state', 'city', 'area') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid region level');
    END IF;

    INSERT INTO public.teams (
        name, description, region_level, state, city, area,
        parent_team_id, team_lead_id, color, created_by
    ) VALUES (
        p_name, p_description, p_region_level, p_state, p_city, p_area,
        p_parent_team_id, p_team_lead_id, p_color, v_caller_id
    ) RETURNING id INTO v_new_team_id;

    IF p_team_lead_id IS NOT NULL THEN
        INSERT INTO public.team_members (team_id, user_id)
        VALUES (v_new_team_id, p_team_lead_id)
        ON CONFLICT (user_id) DO UPDATE SET team_id = v_new_team_id, joined_at = NOW();
    END IF;

    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id, 'CREATE_TEAM', 'teams', v_new_team_id, NULL,
        jsonb_build_object('name', p_name, 'region_level', p_region_level, 'city', p_city, 'area', p_area)
    );

    RETURN jsonb_build_object('success', true, 'team_id', v_new_team_id, 'message', 'Team created successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;

-- 2. admin_add_team_member
CREATE OR REPLACE FUNCTION public.admin_add_team_member(
    p_team_id UUID,
    p_user_id UUID,
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
    v_old_team_id UUID;
BEGIN
    v_caller_id := COALESCE(p_caller_id, auth.uid());
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'sales_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access');
    END IF;

    SELECT role::text, team_id INTO v_target_role, v_old_team_id
    FROM public.user_profiles WHERE id = p_user_id;

    IF v_target_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    INSERT INTO public.team_members (team_id, user_id)
    VALUES (p_team_id, p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET team_id = p_team_id, joined_at = NOW();

    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id, 'ASSIGN_TEAM_MEMBER', 'team_members', p_user_id,
        jsonb_build_object('old_team_id', v_old_team_id),
        jsonb_build_object('new_team_id', p_team_id, 'user_id', p_user_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'User assigned to team successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;

-- 3. admin_remove_team_member
CREATE OR REPLACE FUNCTION public.admin_remove_team_member(
    p_user_id UUID,
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_old_team_id UUID;
BEGIN
    v_caller_id := COALESCE(p_caller_id, auth.uid());
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'sales_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access');
    END IF;

    SELECT team_id INTO v_old_team_id FROM public.team_members WHERE user_id = p_user_id;

    IF v_old_team_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'User is not in any team');
    END IF;

    DELETE FROM public.team_members WHERE user_id = p_user_id;
    UPDATE public.teams SET team_lead_id = NULL WHERE team_lead_id = p_user_id;

    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id, 'REMOVE_TEAM_MEMBER', 'team_members', p_user_id,
        jsonb_build_object('removed_from_team_id', v_old_team_id), NULL
    );

    RETURN jsonb_build_object('success', true, 'message', 'User removed from team successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$func$;

GRANT EXECUTE ON FUNCTION public.admin_create_team(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,UUID,UUID,TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_team_member(UUID,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_team_member(UUID,UUID) TO authenticated;
