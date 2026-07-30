-- ============================================================
-- Team Management System Schema
-- Migration Date: 2026-07-30
-- Features: Multi-region team hierarchy (State -> City -> Area),
--           team membership, trigger sync to user_profiles.team_id,
--           SECURITY DEFINER RPCs & Audit Logging.
-- ============================================================

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    description    TEXT,
    region_level   TEXT NOT NULL CHECK (region_level IN ('state', 'city', 'area')),
    state          TEXT NOT NULL DEFAULT 'Madhya Pradesh',
    city           TEXT,               -- NULL for state-level teams
    area           TEXT,               -- NULL for city/state-level teams
    parent_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    team_lead_id   UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    color          TEXT DEFAULT '#6366f1',
    is_active      BOOLEAN NOT NULL DEFAULT true,
    created_by     UUID REFERENCES auth.users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create team_members table (one team per person constraint)
CREATE TABLE IF NOT EXISTS public.team_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT team_members_user_id_key UNIQUE (user_id)
);

-- 3. Add team_id to user_profiles for fast lookups
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- 4. Trigger to auto-sync user_profiles.team_id with team_members
CREATE OR REPLACE FUNCTION sync_user_profile_team_id()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.user_profiles
        SET team_id = NEW.team_id
        WHERE id = NEW.user_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.user_profiles
        SET team_id = NULL
        WHERE id = OLD.user_id AND team_id = OLD.team_id;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.user_id IS DISTINCT FROM NEW.user_id OR OLD.team_id IS DISTINCT FROM NEW.team_id THEN
            UPDATE public.user_profiles
            SET team_id = NULL
            WHERE id = OLD.user_id AND team_id = OLD.team_id;

            UPDATE public.user_profiles
            SET team_id = NEW.team_id
            WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_team_members ON public.team_members;
CREATE TRIGGER trg_sync_team_members
    AFTER INSERT OR UPDATE OR DELETE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION sync_user_profile_team_id();

-- 5. Enable RLS on teams & team_members
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_authenticated" ON public.teams;
CREATE POLICY "teams_select_authenticated" ON public.teams
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "teams_write_admin" ON public.teams;
CREATE POLICY "teams_write_admin" ON public.teams
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
    );

DROP POLICY IF EXISTS "team_members_select_authenticated" ON public.team_members;
CREATE POLICY "team_members_select_authenticated" ON public.team_members
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "team_members_write_admin_manager" ON public.team_members;
CREATE POLICY "team_members_write_admin_manager" ON public.team_members
    FOR ALL TO authenticated
    USING (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'sales_manager')
    );

-- 6. SECURITY DEFINER RPC: admin_create_team
CREATE OR REPLACE FUNCTION public.admin_create_team(
    p_name TEXT,
    p_region_level TEXT,
    p_description TEXT DEFAULT NULL,
    p_state TEXT DEFAULT 'Madhya Pradesh',
    p_city TEXT DEFAULT NULL,
    p_area TEXT DEFAULT NULL,
    p_parent_team_id UUID DEFAULT NULL,
    p_team_lead_id UUID DEFAULT NULL,
    p_color TEXT DEFAULT '#6366f1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_new_team_id UUID;
    v_lead_role TEXT;
BEGIN
    v_caller_id := auth.uid();
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

    IF p_team_lead_id IS NOT NULL THEN
        SELECT role::text INTO v_lead_role FROM public.user_profiles WHERE id = p_team_lead_id;
        IF v_lead_role IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Target team lead user not found');
        END IF;
    END IF;

    INSERT INTO public.teams (
        name, description, region_level, state, city, area, parent_team_id, team_lead_id, color, created_by
    ) VALUES (
        p_name, p_description, p_region_level, p_state, p_city, p_area, p_parent_team_id, p_team_lead_id, p_color, v_caller_id
    ) RETURNING id INTO v_new_team_id;

    -- If lead specified, ensure lead is added as a team member
    IF p_team_lead_id IS NOT NULL THEN
        INSERT INTO public.team_members (team_id, user_id)
        VALUES (v_new_team_id, p_team_lead_id)
        ON CONFLICT (user_id) DO UPDATE SET team_id = v_new_team_id, joined_at = NOW();
    END IF;

    -- Audit log
    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id,
        'CREATE_TEAM',
        'teams',
        v_new_team_id,
        NULL,
        jsonb_build_object('name', p_name, 'region_level', p_region_level, 'city', p_city, 'area', p_area, 'team_lead_id', p_team_lead_id)
    );

    RETURN jsonb_build_object('success', true, 'team_id', v_new_team_id, 'message', 'Team created successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. SECURITY DEFINER RPC: admin_add_team_member
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
    v_caller_id UUID;
    v_caller_role TEXT;
    v_target_role TEXT;
    v_old_team_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'sales_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access');
    END IF;

    -- Check target user existence and role
    SELECT role::text, team_id INTO v_target_role, v_old_team_id
    FROM public.user_profiles WHERE id = p_user_id;

    IF v_target_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    IF v_target_role NOT IN ('sales_exec', 'sales_manager', 'admin', 'super_admin', 'employee') THEN
        RETURN jsonb_build_object('success', false, 'error', 'User cannot be assigned to a sales team');
    END IF;

    -- Insert or update team member
    INSERT INTO public.team_members (team_id, user_id)
    VALUES (p_team_id, p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET team_id = p_team_id, joined_at = NOW();

    -- Audit log
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

-- 8. SECURITY DEFINER RPC: admin_remove_team_member
CREATE OR REPLACE FUNCTION public.admin_remove_team_member(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_role TEXT;
    v_old_team_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT role::text INTO v_caller_role FROM public.user_profiles WHERE id = v_caller_id;
    IF v_caller_role NOT IN ('admin', 'super_admin', 'sales_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access');
    END IF;

    SELECT team_id INTO v_old_team_id FROM team_members WHERE user_id = p_user_id;

    IF v_old_team_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'User is not in any team');
    END IF;

    DELETE FROM public.team_members WHERE user_id = p_user_id;

    -- Also check if user was team lead of any team and clear it
    UPDATE public.teams SET team_lead_id = NULL WHERE team_lead_id = p_user_id;

    -- Audit log
    INSERT INTO public.audit_logs_crm (actor_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        v_caller_id,
        'REMOVE_TEAM_MEMBER',
        'team_members',
        p_user_id,
        jsonb_build_object('removed_from_team_id', v_old_team_id),
        NULL
    );

    RETURN jsonb_build_object('success', true, 'message', 'User removed from team successfully');
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 9. Grants
GRANT EXECUTE ON FUNCTION public.admin_create_team(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_team_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_team_member(UUID) TO authenticated;

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_teams_parent_id ON public.teams(parent_team_id);
CREATE INDEX IF NOT EXISTS idx_teams_region_level ON public.teams(region_level);
CREATE INDEX IF NOT EXISTS idx_teams_lead_id ON public.teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_team_id ON public.user_profiles(team_id);
