-- Migration: Fix Bulk CRM Preview RPC Column References and Unassigned Record Guard
-- Description: Uses explicit variables for out_team_id and out_match_type to prevent PL/pgSQL unassigned record errors.

CREATE OR REPLACE FUNCTION public.crm_bulk_preview_team_for_location(
    p_locations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_loc_record JSONB;
    v_result JSONB = '[]'::JSONB;
    v_team_id UUID;
    v_match_type territory_area_type;
    v_team_name TEXT;
BEGIN
    FOR v_loc_record IN SELECT * FROM jsonb_array_elements(p_locations)
    LOOP
        v_team_id := NULL;
        v_match_type := NULL;
        v_team_name := NULL;

        -- Look up routing using the existing matching function
        SELECT out_team_id, out_match_type
        INTO v_team_id, v_match_type
        FROM public.crm_match_team_for_location(
            (v_loc_record->>'pincode')::text,
            (v_loc_record->>'zone')::text,
            (v_loc_record->>'area')::text,
            (v_loc_record->>'city')::text,
            (v_loc_record->>'state')::text
        );
        
        IF v_team_id IS NOT NULL THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = v_team_id;

            v_result := v_result || jsonb_build_object(
                'index', (v_loc_record->>'index')::int,
                'matched', true,
                'team_id', v_team_id,
                'match_type', v_match_type,
                'team_name', COALESCE(v_team_name, 'Unknown Team')
            );
        ELSE
            v_result := v_result || jsonb_build_object(
                'index', (v_loc_record->>'index')::int,
                'matched', false
            );
        END IF;
    END LOOP;

    RETURN v_result;
END;
$$;
