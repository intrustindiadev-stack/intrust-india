-- Migration: CRM Lifecycle Architecture - Employee Transfer Synchronization
-- Description: Automatically updates the team assignment on active leads when an employee is transferred.

CREATE OR REPLACE FUNCTION public.fn_sync_leads_on_team_transfer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND NEW.team_id IS DISTINCT FROM OLD.team_id) THEN
        UPDATE public.crm_leads 
        SET assigned_team_id = NEW.team_id 
        WHERE assigned_to = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_leads_on_team_transfer ON public.user_profiles;
CREATE TRIGGER trigger_sync_leads_on_team_transfer
    AFTER UPDATE OF team_id ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_leads_on_team_transfer();
