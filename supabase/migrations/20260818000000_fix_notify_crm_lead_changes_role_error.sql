CREATE OR REPLACE FUNCTION public.notify_crm_lead_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_manager_id UUID;
    v_lead_name TEXT;
BEGIN
    v_lead_name := COALESCE(NEW.contact_name, 'Unknown Lead');

    -- Case 1: Assigned to a specific user
    IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR NEW.assigned_to != OLD.assigned_to) THEN
        -- Notify the new assignee
        PERFORM public.create_notification(
            NEW.assigned_to,
            'New Lead Assigned',
            'Lead ' || v_lead_name || ' has been assigned to you.',
            'info',
            'HIGH',
            '/admin/crm/leads/' || NEW.id,
            'crm_lead_assigned',
            NEW.id,
            'assigned_' || NEW.assigned_to || '_' || extract(epoch from now())::int
        );

        -- Gap Remediation: If claimed from Team Pool, notify the manager
        IF OLD.assigned_to IS NULL AND OLD.assigned_team_id IS NOT NULL THEN
            FOR v_manager_id IN
                SELECT id FROM public.user_profiles WHERE team_id = OLD.assigned_team_id AND role::text IN ('relationship_manager', 'sales_manager', 'admin', 'super_admin')
            LOOP
                PERFORM public.create_notification(
                    v_manager_id,
                    'Lead Claimed from Pool',
                    'Team Pool lead ' || v_lead_name || ' was claimed.',
                    'success',
                    'NORMAL',
                    '/admin/crm/teams/' || OLD.assigned_team_id || '/pool',
                    'crm_lead_claimed',
                    NEW.id,
                    'claimed_' || OLD.assigned_team_id || '_' || NEW.id || '_' || extract(epoch from now())::int
                );
            END LOOP;
        END IF;

    -- Case 2: Sent to Team Pool OR unassigned from user
    ELSIF NEW.assigned_to IS NULL AND (OLD.assigned_to IS NOT NULL OR (NEW.assigned_team_id IS NOT NULL AND OLD.assigned_team_id IS NULL)) THEN
        -- Gap Remediation: If unassigned from an employee, notify previous owner
        IF OLD.assigned_to IS NOT NULL THEN
            PERFORM public.create_notification(
                OLD.assigned_to,
                'Lead Removed',
                'Lead ' || v_lead_name || ' has been unassigned from you.',
                'warning',
                'NORMAL',
                '/admin/crm/leads',
                'crm_lead_removed',
                NEW.id,
                'removed_' || OLD.assigned_to || '_' || extract(epoch from now())::int
            );
        END IF;

        -- Notify manager that it's in the pool
        IF NEW.assigned_team_id IS NOT NULL AND (OLD.assigned_to IS NOT NULL OR OLD.assigned_team_id IS NULL) THEN
            FOR v_manager_id IN
                SELECT id FROM public.user_profiles WHERE team_id = NEW.assigned_team_id AND role::text IN ('relationship_manager', 'sales_manager', 'admin', 'super_admin')
            LOOP
                PERFORM public.create_notification(
                    v_manager_id,
                    'Lead Added to Team Pool',
                    'Lead ' || v_lead_name || ' requires assignment.',
                    'warning',
                    'NORMAL',
                    '/admin/crm/teams/' || NEW.assigned_team_id || '/pool',
                    'crm_lead_pool',
                    NEW.id,
                    'pool_' || NEW.assigned_team_id || '_' || NEW.id || '_' || extract(epoch from now())::int
                );
            END LOOP;
        END IF;
    END IF;

    -- Case 3: Converted
    IF NEW.status != OLD.status AND NEW.status::text IN ('won') THEN
        IF NEW.assigned_to IS NOT NULL THEN
            PERFORM public.create_notification(
                NEW.assigned_to,
                'Lead Converted',
                'Congratulations! Lead ' || v_lead_name || ' has been successfully converted.',
                'success',
                'NORMAL',
                '/admin/crm/leads/' || NEW.id,
                'crm_lead_converted',
                NEW.id,
                'converted_' || extract(epoch from now())::int
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
