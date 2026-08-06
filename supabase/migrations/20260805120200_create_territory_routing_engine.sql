-- Territory Management · Part 3: routing engine
CREATE OR REPLACE FUNCTION public.crm_match_team_for_location(
    p_pincode TEXT, p_zone TEXT, p_area TEXT, p_city TEXT, p_state TEXT,
    OUT out_team_id UUID, OUT out_match_type territory_area_type
) RETURNS record
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT team_id, area_type FROM public.team_service_areas
    WHERE
      (area_type = 'pincode' AND value_norm = lower(btrim(p_pincode))) OR
      (area_type = 'zone'    AND value_norm = lower(btrim(p_zone)) AND (city_norm IS NULL OR city_norm = lower(btrim(p_city)))) OR
      (area_type = 'area'    AND value_norm = lower(btrim(p_area)) AND (city_norm IS NULL OR city_norm = lower(btrim(p_city)))) OR
      (area_type = 'city'    AND value_norm = lower(btrim(p_city)) AND (state_norm IS NULL OR state_norm = lower(btrim(p_state)))) OR
      (area_type = 'state'   AND value_norm = lower(btrim(p_state)))
    ORDER BY
      CASE area_type
        WHEN 'pincode' THEN 1
        WHEN 'zone'    THEN 2
        WHEN 'area'    THEN 3
        WHEN 'city'    THEN 4
        WHEN 'state'   THEN 5
        ELSE 6
      END,
      priority DESC,
      created_at ASC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.crm_pick_team_rep(p_team_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT tm.user_id FROM public.team_members tm
    JOIN public.user_profiles up ON tm.user_id = up.id
    WHERE tm.team_id = p_team_id AND up.role = 'relationship_exec'
    ORDER BY (
        SELECT COUNT(*) FROM public.crm_leads l 
        WHERE l.assigned_to = tm.user_id AND l.routing_status = 'auto_matched'
    ) ASC, up.created_at ASC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.crm_route_lead_territory()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_match RECORD;
    v_rep_id UUID;
    v_actor UUID := auth.uid();
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.routing_status IN ('manual_override', 'reroute_pending')) THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.routing_status = 'auto_matched' THEN
        IF NOT (
            NEW.pincode IS DISTINCT FROM OLD.pincode OR
            NEW.zone IS DISTINCT FROM OLD.zone OR
            NEW.area IS DISTINCT FROM OLD.area OR
            NEW.city IS DISTINCT FROM OLD.city OR
            NEW.state IS DISTINCT FROM OLD.state
        ) THEN
            RETURN NEW; 
        END IF;
    END IF;

    v_match := public.crm_match_team_for_location(NEW.pincode, NEW.zone, NEW.area, NEW.city, NEW.state);

    IF v_match.out_team_id IS NOT NULL THEN
        NEW.assigned_team_id     := v_match.out_team_id;
        NEW.territory_match_type := v_match.out_match_type;
        NEW.routing_status       := 'auto_matched';
        NEW.routed_at            := now();

        IF (TG_OP = 'INSERT' OR NEW.assigned_to IS NULL) THEN
            v_rep_id := public.crm_pick_team_rep(v_match.out_team_id);
            IF v_rep_id IS NOT NULL THEN
                NEW.assigned_to := v_rep_id;
            END IF;
        END IF;
    ELSE
        NEW.assigned_team_id     := NULL;
        NEW.territory_match_type := NULL;
        NEW.routing_status       := 'unmatched';
        NEW.routed_at            := NULL;
        NEW.assigned_to          := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_route_lead_territory ON public.crm_leads;
CREATE TRIGGER trg_crm_route_lead_territory
    BEFORE INSERT OR UPDATE OF pincode, zone, area, city, state, routing_status
    ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.crm_route_lead_territory();

CREATE OR REPLACE FUNCTION public.crm_log_routing_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.assigned_team_id IS NOT NULL THEN
        INSERT INTO public.crm_lead_routing_log (lead_id, from_team_id, to_team_id, match_type, reason, actor_id)
        VALUES (NEW.id, NULL, NEW.assigned_team_id, NEW.territory_match_type, 'initial_route', auth.uid());
    ELSIF TG_OP = 'UPDATE' AND NEW.assigned_team_id IS DISTINCT FROM OLD.assigned_team_id THEN
        INSERT INTO public.crm_lead_routing_log (lead_id, from_team_id, to_team_id, match_type, reason, actor_id)
        VALUES (NEW.id, OLD.assigned_team_id, NEW.assigned_team_id, NEW.territory_match_type, 
                CASE WHEN NEW.routing_status = 'manual_override' THEN 'manual_override' ELSE 'location_change' END, 
                auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_log_routing_change ON public.crm_leads;
CREATE TRIGGER trg_crm_log_routing_change
    AFTER INSERT OR UPDATE OF assigned_team_id
    ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.crm_log_routing_change();
