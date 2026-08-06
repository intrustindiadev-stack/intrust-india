-- Territory Management · Part 4: RLS, Dashboard RPC, Reroute RPC
CREATE OR REPLACE FUNCTION public.crm_current_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.crm_authorized_team_ids() RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT array_agg(id) FROM public.teams t WHERE EXISTS (
        SELECT 1 FROM public.team_get_user_subtree(auth.uid()) st WHERE st.team_id = t.id
    );
$$;

DROP POLICY IF EXISTS "crm_leads_select" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_select_super" ON public.crm_leads;
CREATE POLICY "crm_leads_select_super" ON public.crm_leads FOR SELECT TO authenticated
    USING (public.crm_current_role() IN ('admin', 'super_admin'));
DROP POLICY IF EXISTS "crm_leads_select_manager" ON public.crm_leads;
CREATE POLICY "crm_leads_select_manager" ON public.crm_leads FOR SELECT TO authenticated
    USING (
        public.crm_current_role() = 'relationship_manager' AND 
        assigned_team_id = ANY(public.crm_authorized_team_ids())
    );
DROP POLICY IF EXISTS "crm_leads_select_exec" ON public.crm_leads;
CREATE POLICY "crm_leads_select_exec" ON public.crm_leads FOR SELECT TO authenticated
    USING (
        public.crm_current_role() = 'relationship_exec' AND 
        (
            assigned_to = auth.uid() OR created_by = auth.uid() OR
            (assigned_team_id IS NOT NULL AND assigned_team_id = ANY(public.crm_authorized_team_ids()))
        )
    );

DROP POLICY IF EXISTS "tsa_select_all" ON public.team_service_areas;
CREATE POLICY "tsa_select_all" ON public.team_service_areas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "routing_log_select" ON public.crm_lead_routing_log;
CREATE POLICY "routing_log_select" ON public.crm_lead_routing_log FOR SELECT TO authenticated
    USING (
        public.crm_current_role() IN ('admin', 'super_admin') OR
        (public.crm_current_role() = 'relationship_manager' AND to_team_id = ANY(public.crm_authorized_team_ids()))
    );

CREATE OR REPLACE FUNCTION public.crm_territory_dashboard(p_team_id UUID DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    WITH scope AS (
        SELECT unnest(public.crm_authorized_team_ids()) AS tid
    ),
    leads AS (
        SELECT l.id, l.routing_status, l.territory_match_type
        FROM public.crm_leads l
        WHERE (p_team_id IS NULL OR l.assigned_team_id = p_team_id)
          AND (l.assigned_team_id IN (SELECT tid FROM scope) OR l.assigned_team_id IS NULL)
    )
    SELECT jsonb_build_object(
        'total', (SELECT count(*) FROM leads),
        'unmatched', (SELECT count(*) FROM leads WHERE routing_status = 'unmatched'),
        'manual', (SELECT count(*) FROM leads WHERE routing_status = 'manual_override'),
        'auto', (SELECT count(*) FROM leads WHERE routing_status = 'auto_matched'),
        'by_type', (
            SELECT coalesce(jsonb_object_agg(t.t, t.c), '{}'::jsonb)
            FROM (SELECT coalesce(territory_match_type::text, 'none') AS t, count(*) AS c FROM leads GROUP BY 1) t
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.crm_preview_team_for_location(
    p_pincode TEXT, p_zone TEXT, p_area TEXT, p_city TEXT, p_state TEXT
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_match RECORD;
    v_team RECORD;
BEGIN
    v_match := public.crm_match_team_for_location(p_pincode, p_zone, p_area, p_city, p_state);
    IF v_match.out_team_id IS NULL THEN RETURN jsonb_build_object('matched', false); END IF;
    SELECT id, name INTO v_team FROM public.teams WHERE id = v_match.out_team_id;
    RETURN jsonb_build_object(
        'matched', true,
        'team_id', v_team.id,
        'team_name', v_team.name,
        'match_type', v_match.out_match_type
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_reroute_leads()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_lead RECORD;
    v_count INT := 0;
BEGIN
    IF public.crm_current_role() NOT IN ('admin', 'super_admin', 'relationship_manager') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    FOR v_lead IN 
        SELECT id FROM public.crm_leads WHERE routing_status IN ('unmatched', 'reroute_pending')
    LOOP
        UPDATE public.crm_leads SET routing_status = 'reroute_pending' WHERE id = v_lead.id;
        v_count := v_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object('status', 'success', 'rerouted_count', v_count);
END;
$$;
