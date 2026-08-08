-- 20260810040000_replace_environment_with_routing_flag.sql

-- 1. Drop the triggers and function for environment protection
DROP TRIGGER IF EXISTS trg_team_environment_protection ON public.teams;
DROP FUNCTION IF EXISTS public.check_team_environment_change();

-- 2. Drop the environment column and its check constraint
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_environment_check;
ALTER TABLE public.teams DROP COLUMN IF EXISTS environment;

-- 3. Add internal routing eligibility flag
ALTER TABLE public.teams ADD COLUMN is_routing_eligible BOOLEAN NOT NULL DEFAULT true;

-- 4. Disable routing for DEV_FINAL (id: 2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef)
UPDATE public.teams SET is_routing_eligible = false WHERE id = '2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef';

-- 5. Update crm_match_team_for_location to use the new flag
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
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    SELECT tsa.team_id, tsa.area_type
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
$function$;
