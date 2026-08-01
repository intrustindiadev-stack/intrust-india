-- ============================================================
-- Production Hardening for Team Management System
-- Migration Date: 2026-08-01
-- Features:
--   1. Optimistic Concurrency (version column)
--   2. Structural hierarchy checks & cycle prevention
--   3. Cleanup of obsolete RPC overloads
--   4. Re-architected SECURITY DEFINER RPCs (service_role execution only)
--   5. Subtree recursive calculation helper
--   6. Atomic audit logging for all team operations
-- ============================================================

-- 1. Add version column for optimistic concurrency control
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

-- 2. Drop obsolete RPC signatures to eliminate overload ambiguity
DROP FUNCTION IF EXISTS public.admin_create_team(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_create_team(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS public.admin_add_team_member(UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_add_team_member(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.admin_remove_team_member(UUID);
DROP FUNCTION IF EXISTS public.admin_remove_team_member(UUID, UUID);

-- 3. Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_teams_parent_id_active ON public.teams(parent_team_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON public.teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_team_id ON public.user_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_region_location ON public.teams(region_level, state, city, area) WHERE is_active = true;

-- Unique name per parent team for active teams
CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_active_name_parent_unique 
ON public.teams (COALESCE(parent_team_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(TRIM(name))) 
WHERE is_active = true;

-- 4. Hierarchy Validation Trigger Function
CREATE OR REPLACE FUNCTION public.check_team_hierarchy_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_parent RECORD;
    v_curr_id UUID;
    v_depth INT := 0;
BEGIN
    -- Normalized name
    NEW.name := TRIM(NEW.name);
    IF LENGTH(NEW.name) = 0 THEN
        RAISE EXCEPTION 'TEAM_NAME_EMPTY: Team name cannot be blank';
    END IF;

    -- Prevent self parenting
    IF NEW.parent_team_id IS NOT NULL AND NEW.parent_team_id = NEW.id THEN
        RAISE EXCEPTION 'HIERARCHY_CYCLE: Team cannot be its own parent';
    END IF;

    -- Validate Region Level & Geography rules
    IF NEW.region_level NOT IN ('state', 'city', 'area') THEN
        RAISE EXCEPTION 'INVALID_LEVEL: Invalid region level %', NEW.region_level;
    END IF;

    IF NEW.region_level = 'state' THEN
        NEW.city := NULL;
        NEW.area := NULL;
    ELSIF NEW.region_level = 'city' THEN
        IF NEW.city IS NULL OR TRIM(NEW.city) = '' THEN
            RAISE EXCEPTION 'INVALID_LOCATION: City is required for city-level teams';
        END IF;
        NEW.area := NULL;

        IF NEW.parent_team_id IS NULL THEN
            RAISE EXCEPTION 'INVALID_PARENT: City team requires a state-level parent team';
        END IF;

        SELECT id, region_level, state INTO v_parent FROM public.teams WHERE id = NEW.parent_team_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'PARENT_NOT_FOUND: Parent state team does not exist or is inactive';
        END IF;
        IF v_parent.region_level != 'state' THEN
            RAISE EXCEPTION 'INVALID_PARENT_LEVEL: Parent of a city team must be a state-level team';
        END IF;
        IF LOWER(TRIM(v_parent.state)) != LOWER(TRIM(NEW.state)) THEN
            RAISE EXCEPTION 'LOCATION_MISMATCH: City team state must match parent state';
        END IF;

    ELSIF NEW.region_level = 'area' THEN
        IF NEW.city IS NULL OR TRIM(NEW.city) = '' OR NEW.area IS NULL OR TRIM(NEW.area) = '' THEN
            RAISE EXCEPTION 'INVALID_LOCATION: City and Area are required for area-level teams';
        END IF;

        IF NEW.parent_team_id IS NULL THEN
            RAISE EXCEPTION 'INVALID_PARENT: Area team requires a city-level parent team';
        END IF;

        SELECT id, region_level, state, city INTO v_parent FROM public.teams WHERE id = NEW.parent_team_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'PARENT_NOT_FOUND: Parent city team does not exist or is inactive';
        END IF;
        IF v_parent.region_level != 'city' THEN
            RAISE EXCEPTION 'INVALID_PARENT_LEVEL: Parent of an area team must be a city-level team';
        END IF;
        IF LOWER(TRIM(v_parent.state)) != LOWER(TRIM(NEW.state)) OR LOWER(TRIM(v_parent.city)) != LOWER(TRIM(NEW.city)) THEN
            RAISE EXCEPTION 'LOCATION_MISMATCH: Area team state and city must match parent team location';
        END IF;
    END IF;

    -- Cycle check using recursive parent check
    IF NEW.parent_team_id IS NOT NULL THEN
        v_curr_id := NEW.parent_team_id;
        WHILE v_curr_id IS NOT NULL LOOP
            v_depth := v_depth + 1;
            IF v_depth > 50 THEN
                RAISE EXCEPTION 'HIERARCHY_CYCLE: Exceeded max depth, cycle detected';
            END IF;
            IF NEW.id IS NOT NULL AND v_curr_id = NEW.id THEN
                RAISE EXCEPTION 'HIERARCHY_CYCLE: Ancestor/descendant cycle detected';
            END IF;
            SELECT parent_team_id INTO v_curr_id FROM public.teams WHERE id = v_curr_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_hierarchy_check ON public.teams;
CREATE TRIGGER trg_teams_hierarchy_check
    BEFORE INSERT OR UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.check_team_hierarchy_integrity();


-- 5. Helper Function: Get User's Authorized Subtree Team IDs
CREATE OR REPLACE FUNCTION public.team_get_user_subtree(p_user_id UUID)
RETURNS TABLE (team_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT;
    v_user_team_id UUID;
BEGIN
    SELECT role::text, team_id INTO v_role, v_user_team_id
    FROM public.user_profiles WHERE id = p_user_id;

    IF v_role IN ('admin', 'super_admin') THEN
        RETURN QUERY SELECT t.id FROM public.teams t WHERE t.is_active = true;
    ELSIF v_role = 'relationship_manager' THEN
        RETURN QUERY
        WITH RECURSIVE manager_teams AS (
            -- Base case: teams led by user OR team user belongs to
            SELECT id FROM public.teams
            WHERE is_active = true AND (team_lead_id = p_user_id OR id = v_user_team_id)
            UNION
            -- Recursive case: active children of manager teams
            SELECT child.id FROM public.teams child
            INNER JOIN manager_teams parent ON child.parent_team_id = parent.id
            WHERE child.is_active = true
        )
        SELECT DISTINCT id FROM manager_teams;
    ELSIF v_role = 'relationship_exec' THEN
        IF v_user_team_id IS NOT NULL THEN
            RETURN QUERY SELECT t.id FROM public.teams t WHERE t.id = v_user_team_id AND t.is_active = true;
        END IF;
    END IF;
    RETURN;
END;
$$;


-- 6. Canonical Transactional RPC: admin_create_team
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
    p_caller_id UUID DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_new_team_id UUID;
    v_lead_role TEXT;
BEGIN
    v_caller_id := p_caller_id;
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'error', 'Caller ID required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Only admins can create teams');
    END IF;

    IF p_team_lead_id IS NOT NULL THEN
        SELECT role::text INTO v_lead_role FROM public.user_profiles WHERE id = p_team_lead_id;
        IF v_lead_role IS NULL THEN
            RETURN jsonb_build_object('success', false, 'code', 'USER_NOT_FOUND', 'error', 'Target team lead not found');
        END IF;
        IF v_lead_role NOT IN ('relationship_manager', 'admin', 'super_admin') THEN
            RETURN jsonb_build_object('success', false, 'code', 'USER_INELIGIBLE', 'error', 'Target lead must have manager or admin role');
        END IF;
    END IF;

    INSERT INTO public.teams (
        name, description, region_level, state, city, area,
        parent_team_id, team_lead_id, color, created_by, version
    ) VALUES (
        TRIM(p_name), p_description, p_region_level, p_state, p_city, p_area,
        p_parent_team_id, p_team_lead_id, p_color, v_caller_id, 1
    ) RETURNING id INTO v_new_team_id;

    -- If lead specified, ensure lead is added as a team member
    IF p_team_lead_id IS NOT NULL THEN
        INSERT INTO public.team_members (team_id, user_id)
        VALUES (v_new_team_id, p_team_lead_id)
        ON CONFLICT (user_id) DO UPDATE SET team_id = v_new_team_id, joined_at = NOW();
    END IF;

    -- Audit Log
    INSERT INTO public.audit_logs_crm (
        actor_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
        v_caller_id,
        'CREATE_TEAM',
        'teams',
        v_new_team_id,
        NULL,
        jsonb_build_object(
            'team_id', v_new_team_id,
            'name', TRIM(p_name),
            'region_level', p_region_level,
            'state', p_state,
            'city', p_city,
            'area', p_area,
            'parent_team_id', p_parent_team_id,
            'team_lead_id', p_team_lead_id,
            'request_id', p_request_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'team_id', v_new_team_id,
        'version', 1,
        'message', 'Team created successfully'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', SQLSTATE, 'error', SQLERRM);
END;
$$;


-- 7. Canonical Transactional RPC: admin_update_team
CREATE OR REPLACE FUNCTION public.admin_update_team(
    p_team_id UUID,
    p_expected_version INT DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_region_level TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_area TEXT DEFAULT NULL,
    p_parent_team_id UUID DEFAULT NULL,
    p_team_lead_id UUID DEFAULT NULL,
    p_color TEXT DEFAULT NULL,
    p_retain_old_lead BOOLEAN DEFAULT TRUE,
    p_caller_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_curr_team RECORD;
    v_old_lead_id UUID;
    v_new_lead_role TEXT;
    v_new_version INT;
BEGIN
    v_caller_id := p_caller_id;
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'error', 'Caller ID required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Only admins can update team details');
    END IF;

    SELECT * INTO v_curr_team FROM public.teams WHERE id = p_team_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_NOT_FOUND', 'error', 'Team not found');
    END IF;

    IF NOT v_curr_team.is_active THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_INACTIVE', 'error', 'Cannot update inactive team');
    END IF;

    -- Optimistic Concurrency Control
    IF p_expected_version IS NOT NULL AND v_curr_team.version != p_expected_version THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VERSION_CONFLICT',
            'error', 'Team has been modified by another request. Current version is ' || v_curr_team.version
        );
    END IF;

    v_old_lead_id := v_curr_team.team_lead_id;

    IF p_team_lead_id IS DISTINCT FROM v_old_lead_id AND p_team_lead_id IS NOT NULL THEN
        SELECT role::text INTO v_new_lead_role FROM public.user_profiles WHERE id = p_team_lead_id;
        IF v_new_lead_role IS NULL THEN
            RETURN jsonb_build_object('success', false, 'code', 'USER_NOT_FOUND', 'error', 'New team lead not found');
        END IF;
        IF v_new_lead_role NOT IN ('relationship_manager', 'admin', 'super_admin') THEN
            RETURN jsonb_build_object('success', false, 'code', 'USER_INELIGIBLE', 'error', 'Team lead must have manager or admin role');
        END IF;
    END IF;

    v_new_version := v_curr_team.version + 1;

    UPDATE public.teams
    SET name = COALESCE(TRIM(p_name), name),
        description = COALESCE(p_description, description),
        region_level = COALESCE(p_region_level, region_level),
        state = COALESCE(p_state, state),
        city = COALESCE(p_city, city),
        area = COALESCE(p_area, area),
        parent_team_id = CASE WHEN p_parent_team_id IS NOT NULL THEN p_parent_team_id ELSE parent_team_id END,
        team_lead_id = CASE WHEN p_team_lead_id IS NOT NULL THEN p_team_lead_id ELSE team_lead_id END,
        color = COALESCE(p_color, color),
        version = v_new_version,
        updated_at = NOW()
    WHERE id = p_team_id;

    -- Handle lead change
    IF p_team_lead_id IS DISTINCT FROM v_old_lead_id THEN
        -- Add new lead to team members if specified
        IF p_team_lead_id IS NOT NULL THEN
            INSERT INTO public.team_members (team_id, user_id)
            VALUES (p_team_id, p_team_lead_id)
            ON CONFLICT (user_id) DO UPDATE SET team_id = p_team_id, joined_at = NOW();
        END IF;

        -- If explicit request not to retain old lead, remove old lead from team members
        IF v_old_lead_id IS NOT NULL AND NOT p_retain_old_lead THEN
            DELETE FROM public.team_members WHERE user_id = v_old_lead_id AND team_id = p_team_id;
        END IF;
    END IF;

    -- Audit Log
    INSERT INTO public.audit_logs_crm (
        actor_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
        v_caller_id,
        'UPDATE_TEAM',
        'teams',
        p_team_id,
        to_jsonb(v_curr_team),
        jsonb_build_object(
            'name', COALESCE(p_name, v_curr_team.name),
            'parent_team_id', p_parent_team_id,
            'team_lead_id', p_team_lead_id,
            'old_lead_id', v_old_lead_id,
            'retain_old_lead', p_retain_old_lead,
            'version', v_new_version,
            'reason', p_reason,
            'request_id', p_request_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'team_id', p_team_id,
        'version', v_new_version,
        'message', 'Team updated successfully'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', SQLSTATE, 'error', SQLERRM);
END;
$$;


-- 8. Canonical Transactional RPC: admin_add_team_member
CREATE OR REPLACE FUNCTION public.admin_add_team_member(
    p_team_id UUID,
    p_user_id UUID,
    p_caller_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
    v_old_team_id UUID;
    v_team RECORD;
    v_authorized_scope UUID[];
BEGIN
    v_caller_id := p_caller_id;
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'error', 'Caller ID required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'relationship_manager') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Unauthorized access');
    END IF;

    -- Target Team Check
    SELECT * INTO v_team FROM public.teams WHERE id = p_team_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_NOT_FOUND', 'error', 'Target team does not exist or is inactive');
    END IF;

    -- Target User Role & Protection Check
    SELECT role::text, team_id INTO v_target_role, v_old_team_id
    FROM public.user_profiles WHERE id = p_user_id;

    IF v_target_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'USER_NOT_FOUND', 'error', 'Target user not found');
    END IF;

    -- Protect super_admin / admin from manager-initiated reassignment
    IF v_caller_role = 'relationship_manager' AND v_target_role IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'code', 'PROTECTED_USER', 'error', 'Managers cannot reassign administrator profiles');
    END IF;

    -- Subtree Scope Check for Relationship Managers
    IF v_caller_role = 'relationship_manager' THEN
        SELECT ARRAY_AGG(team_id) INTO v_authorized_scope FROM public.team_get_user_subtree(v_caller_id);
        IF NOT (p_team_id = ANY(v_authorized_scope)) THEN
            RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Target team is outside your managed subtree');
        END IF;
        IF v_old_team_id IS NOT NULL AND NOT (v_old_team_id = ANY(v_authorized_scope)) THEN
            RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Source team is outside your managed subtree');
        END IF;
    END IF;

    -- Perform Assignment
    INSERT INTO public.team_members (team_id, user_id)
    VALUES (p_team_id, p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET team_id = p_team_id, joined_at = NOW();

    -- Audit Log
    INSERT INTO public.audit_logs_crm (
        actor_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
        v_caller_id,
        'ASSIGN_TEAM_MEMBER',
        'team_members',
        p_user_id,
        jsonb_build_object('old_team_id', v_old_team_id),
        jsonb_build_object(
            'new_team_id', p_team_id,
            'user_id', p_user_id,
            'reason', p_reason,
            'request_id', p_request_id
        )
    );

    RETURN jsonb_build_object('success', true, 'message', 'User assigned to team successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', SQLSTATE, 'error', SQLERRM);
END;
$$;


-- 9. Canonical Transactional RPC: admin_bulk_transfer_members
CREATE OR REPLACE FUNCTION public.admin_bulk_transfer_members(
    p_source_team_id UUID,
    p_target_team_id UUID,
    p_user_ids UUID[],
    p_caller_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_uid UUID;
    v_res JSONB;
    v_transferred_count INT := 0;
BEGIN
    v_caller_id := p_caller_id;
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'error', 'Caller ID required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'relationship_manager') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Unauthorized access');
    END IF;

    FOREACH v_uid IN ARRAY p_user_ids LOOP
        v_res := public.admin_add_team_member(p_target_team_id, v_uid, v_caller_id, p_reason, p_request_id);
        IF (v_res->>'success')::boolean IS TRUE THEN
            v_transferred_count := v_transferred_count + 1;
        ELSE
            RAISE EXCEPTION 'BULK_TRANSFER_FAILED: Failed to transfer user %: %', v_uid, (v_res->>'error');
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'transferred_count', v_transferred_count,
        'message', 'Transferred ' || v_transferred_count || ' members successfully'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', SQLSTATE, 'error', SQLERRM);
END;
$$;


-- 10. Canonical Transactional RPC: admin_remove_team_member
CREATE OR REPLACE FUNCTION public.admin_remove_team_member(
    p_user_id UUID,
    p_caller_id UUID DEFAULT NULL,
    p_team_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_old_team_id UUID;
    v_authorized_scope UUID[];
BEGIN
    v_caller_id := p_caller_id;
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'error', 'Caller ID required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'relationship_manager') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Unauthorized access');
    END IF;

    SELECT team_id INTO v_old_team_id FROM public.team_members WHERE user_id = p_user_id;
    IF v_old_team_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'User is not currently assigned to any team');
    END IF;

    -- Subtree Scope Check for Relationship Managers
    IF v_caller_role = 'relationship_manager' THEN
        SELECT ARRAY_AGG(team_id) INTO v_authorized_scope FROM public.team_get_user_subtree(v_caller_id);
        IF NOT (v_old_team_id = ANY(v_authorized_scope)) THEN
            RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Member is outside your managed subtree');
        END IF;
    END IF;

    DELETE FROM public.team_members WHERE user_id = p_user_id;

    -- Clear lead status ONLY for the team from which user is being removed
    UPDATE public.teams SET team_lead_id = NULL WHERE id = v_old_team_id AND team_lead_id = p_user_id;

    -- Audit Log
    INSERT INTO public.audit_logs_crm (
        actor_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
        v_caller_id,
        'REMOVE_TEAM_MEMBER',
        'team_members',
        p_user_id,
        jsonb_build_object('removed_from_team_id', v_old_team_id),
        jsonb_build_object('reason', p_reason, 'request_id', p_request_id)
    );

    RETURN jsonb_build_object('success', true, 'message', 'User removed from team successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', SQLSTATE, 'error', SQLERRM);
END;
$$;


-- 11. Canonical Transactional RPC: admin_deactivate_team
CREATE OR REPLACE FUNCTION public.admin_deactivate_team(
    p_team_id UUID,
    p_expected_version INT DEFAULT NULL,
    p_caller_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_request_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_curr_team RECORD;
    v_active_children_count INT;
    v_active_members_count INT;
BEGIN
    v_caller_id := p_caller_id;
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHENTICATED', 'error', 'Caller ID required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN_SCOPE', 'error', 'Only admins can deactivate teams');
    END IF;

    SELECT * INTO v_curr_team FROM public.teams WHERE id = p_team_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_NOT_FOUND', 'error', 'Team not found');
    END IF;

    IF NOT v_curr_team.is_active THEN
        RETURN jsonb_build_object('success', true, 'message', 'Team is already inactive');
    END IF;

    -- Concurrency check
    IF p_expected_version IS NOT NULL AND v_curr_team.version != p_expected_version THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'VERSION_CONFLICT',
            'error', 'Team version conflict. Refresh and try again.'
        );
    END IF;

    -- Reject if active child teams exist
    SELECT COUNT(*) INTO v_active_children_count FROM public.teams WHERE parent_team_id = p_team_id AND is_active = true;
    IF v_active_children_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'TEAM_HAS_CHILDREN',
            'error', 'Cannot deactivate team with ' || v_active_children_count || ' active child team(s). Reassign or deactivate children first.'
        );
    END IF;

    -- Deactivate team
    UPDATE public.teams
    SET is_active = false,
        version = version + 1,
        updated_at = NOW()
    WHERE id = p_team_id;

    -- Remove members from team_members
    SELECT COUNT(*) INTO v_active_members_count FROM public.team_members WHERE team_id = p_team_id;
    DELETE FROM public.team_members WHERE team_id = p_team_id;

    -- Clear lead
    UPDATE public.teams SET team_lead_id = NULL WHERE id = p_team_id;

    -- Audit Log
    INSERT INTO public.audit_logs_crm (
        actor_id, action, table_name, record_id, old_data, new_data
    ) VALUES (
        v_caller_id,
        'DEACTIVATE_TEAM',
        'teams',
        p_team_id,
        to_jsonb(v_curr_team),
        jsonb_build_object(
            'removed_members_count', v_active_members_count,
            'reason', p_reason,
            'request_id', p_request_id
        )
    );

    RETURN jsonb_build_object('success', true, 'message', 'Team deactivated successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'code', SQLSTATE, 'error', SQLERRM);
END;
$$;


-- 12. Security Privileges & Revocations
REVOKE EXECUTE ON FUNCTION public.team_get_user_subtree(UUID) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.admin_create_team(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_team(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.admin_add_team_member(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.admin_bulk_transfer_members(UUID, UUID, UUID[], UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.admin_remove_team_member(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.admin_deactivate_team(UUID, INT, UUID, TEXT, TEXT) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.team_get_user_subtree(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_team(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_team(UUID, INT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_team_member(UUID, UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_transfer_members(UUID, UUID, UUID[], UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_team_member(UUID, UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_deactivate_team(UUID, INT, UUID, TEXT, TEXT) TO service_role;
