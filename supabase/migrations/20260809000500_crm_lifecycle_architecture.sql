-- Migration: CRM Lifecycle Architecture - Lead Team Synchronization
-- Description: Cleans up data anomalies and adds a trigger to sync team assignments.

-- 1. Data Cleanup: Realign existing mismatched leads
UPDATE public.crm_leads l
SET assigned_team_id = u.team_id
FROM public.user_profiles u
WHERE l.assigned_to = u.id 
  AND (l.assigned_team_id IS DISTINCT FROM u.team_id);

-- 2. Create Trigger Function to keep team assignment in sync with owner assignment
CREATE OR REPLACE FUNCTION public.fn_sync_lead_team()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only act if assigned_to has changed and is not null
    IF (TG_OP = 'INSERT' AND NEW.assigned_to IS NOT NULL) OR 
       (TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL) THEN
       
        -- Automatically fetch the user's current team_id and set it on the lead
        NEW.assigned_team_id := (
            SELECT team_id 
            FROM public.user_profiles 
            WHERE id = NEW.assigned_to
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Attach trigger to crm_leads
DROP TRIGGER IF EXISTS trigger_sync_lead_team ON public.crm_leads;
CREATE TRIGGER trigger_sync_lead_team
    BEFORE INSERT OR UPDATE ON public.crm_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_lead_team();
