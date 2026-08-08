-- 20260810030000_enhance_environment_protections.sql

-- 1. Remove the implicit default for environment
ALTER TABLE public.teams ALTER COLUMN environment DROP DEFAULT;

-- 2. Create function to protect environment changes
CREATE OR REPLACE FUNCTION public.check_team_environment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_service_area_count INT;
    v_team_member_count INT;
    v_assigned_lead_count INT;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.environment IS DISTINCT FROM NEW.environment THEN
        -- Check for active service areas
        SELECT count(*) INTO v_service_area_count 
        FROM public.team_service_areas 
        WHERE team_id = OLD.id;

        IF v_service_area_count > 0 THEN
            RAISE EXCEPTION 'Cannot change team environment because it has % active service areas. Remove them first.', v_service_area_count;
        END IF;

        -- Check for active team members
        SELECT count(*) INTO v_team_member_count 
        FROM public.team_members 
        WHERE team_id = OLD.id AND status = 'active';

        IF v_team_member_count > 0 THEN
            RAISE EXCEPTION 'Cannot change team environment because it has % active members. Remove them first.', v_team_member_count;
        END IF;

        -- Check for assigned leads
        SELECT count(*) INTO v_assigned_lead_count 
        FROM public.crm_leads 
        WHERE assigned_team_id = OLD.id;

        IF v_assigned_lead_count > 0 THEN
            RAISE EXCEPTION 'Cannot change team environment because it has % assigned leads. Reassign them first.', v_assigned_lead_count;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Attach trigger to teams
DROP TRIGGER IF EXISTS trg_team_environment_protection ON public.teams;
CREATE TRIGGER trg_team_environment_protection
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.check_team_environment_change();
