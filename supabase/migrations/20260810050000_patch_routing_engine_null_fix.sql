-- 20260810050000_patch_routing_engine_null_fix.sql

CREATE OR REPLACE FUNCTION public.crm_match_team_for_location(
    p_pincode text, 
    p_zone text, 
    p_area text, 
    p_city text, 
    p_state text, 
    OUT out_team_id uuid, 
    OUT out_match_type territory_area_type
)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
    SELECT tsa.team_id, tsa.area_type
    INTO out_team_id, out_match_type
    FROM public.team_service_areas tsa
    JOIN public.teams t ON tsa.team_id = t.id
    WHERE t.is_active = true 
      AND t.is_routing_eligible = true
      AND (
        (tsa.area_type = 'pincode' AND tsa.value_norm = lower(btrim(p_pincode)))
        OR (tsa.area_type = 'zone' AND tsa.value_norm = lower(btrim(p_zone)))
        OR (tsa.area_type = 'area' AND tsa.value_norm = lower(btrim(p_area)))
        OR (tsa.area_type = 'city' AND tsa.value_norm = lower(btrim(p_city)))
        OR (tsa.area_type = 'state' AND tsa.value_norm = lower(btrim(p_state)))
      )
    ORDER BY
      CASE tsa.area_type
        WHEN 'pincode' THEN 1
        WHEN 'zone' THEN 2
        WHEN 'area' THEN 3
        WHEN 'city' THEN 4
        WHEN 'state' THEN 5
      END
    LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crm_route_lead_territory()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_match RECORD;
    v_rep_id UUID;
    v_team_changed BOOLEAN;
BEGIN
    -- manual_override explicitly bypasses automatic routing
    IF (TG_OP = 'UPDATE' AND NEW.routing_status = 'manual_override') THEN
        RETURN NEW;
    END IF;

    -- Boundary Normalization
    NEW.pincode := NULLIF(btrim(NEW.pincode), '');
    NEW.zone    := NULLIF(btrim(NEW.zone), '');
    NEW.area    := NULLIF(btrim(NEW.area), '');
    NEW.city    := NULLIF(btrim(NEW.city), '');
    NEW.state   := NULLIF(btrim(NEW.state), '');

    -- If it's already auto_matched, only re-route if location changed
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
        -- Check if team has changed BEFORE updating NEW
        v_team_changed := (TG_OP = 'UPDATE' AND v_match.out_team_id IS DISTINCT FROM OLD.assigned_team_id) OR (TG_OP = 'INSERT');

        NEW.assigned_team_id     := v_match.out_team_id;
        NEW.territory_match_type := v_match.out_match_type;
        NEW.routing_status       := 'auto_matched';
        NEW.routed_at            := now();

        IF (NEW.assigned_to IS NULL OR v_team_changed) THEN
            v_rep_id := public.crm_pick_team_rep(v_match.out_team_id);
            NEW.assigned_to := v_rep_id;
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
