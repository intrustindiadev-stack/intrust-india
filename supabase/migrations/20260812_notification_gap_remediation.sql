-- Phase 10 Gap Remediation for Notification System

-- 1. Update notify_crm_lead_changes to handle team pool claim and lead removal
CREATE OR REPLACE FUNCTION public.notify_crm_lead_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_manager_id UUID;
    v_lead_name TEXT;
BEGIN
    v_lead_name := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
    
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
                SELECT user_id FROM public.team_members WHERE team_id = OLD.assigned_team_id AND role IN ('manager', 'lead', 'admin')
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
                SELECT user_id FROM public.team_members WHERE team_id = NEW.assigned_team_id AND role IN ('manager', 'lead', 'admin')
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
    IF NEW.status != OLD.status AND NEW.status IN ('converted', 'won') THEN
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
$$;

-- 2. Create trigger for admin_tasks
CREATE OR REPLACE FUNCTION public.notify_admin_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.assigned_to IS NOT NULL THEN
            PERFORM public.create_notification(
                NEW.assigned_to,
                'New Task Assigned',
                'Task: ' || NEW.title,
                'info',
                'HIGH',
                '/admin/tasks',
                'admin_task',
                NEW.id,
                'admin_task_assigned_' || NEW.id || '_' || extract(epoch from now())::int
            );
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Reassignment
        IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR NEW.assigned_to != OLD.assigned_to) THEN
            PERFORM public.create_notification(
                NEW.assigned_to,
                'Task Reassigned',
                'Task: ' || NEW.title || ' has been reassigned to you.',
                'info',
                'HIGH',
                '/admin/tasks',
                'admin_task',
                NEW.id,
                'admin_task_reassigned_' || NEW.assigned_to || '_' || extract(epoch from now())::int
            );
        END IF;
        
        -- Completion (Notify Assigner)
        IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
            IF NEW.assigned_by IS NOT NULL AND NEW.assigned_by != NEW.assigned_to THEN
                PERFORM public.create_notification(
                    NEW.assigned_by,
                    'Task Completed',
                    'Task: ' || NEW.title || ' has been completed.',
                    'success',
                    'NORMAL',
                    '/admin/tasks',
                    'admin_task',
                    NEW.id,
                    'admin_task_completed_' || NEW.id || '_' || extract(epoch from now())::int
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admin_task_changes_insert ON public.admin_tasks;
CREATE TRIGGER trigger_notify_admin_task_changes_insert
AFTER INSERT ON public.admin_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_task_changes();

DROP TRIGGER IF EXISTS trigger_notify_admin_task_changes_update ON public.admin_tasks;
CREATE TRIGGER trigger_notify_admin_task_changes_update
AFTER UPDATE ON public.admin_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_task_changes();

-- 3. Create trigger for Employee Lifecycle (user_profiles role changes)
CREATE OR REPLACE FUNCTION public.notify_user_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.role != OLD.role THEN
            PERFORM public.create_notification(
                NEW.id,
                'Role Updated',
                'Your account role has been updated to ' || NEW.role || '.',
                'info',
                'HIGH',
                '/profile',
                'profile_role_update',
                NEW.id,
                'role_update_' || extract(epoch from now())::int
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_user_profile_changes ON public.user_profiles;
CREATE TRIGGER trigger_notify_user_profile_changes
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_user_profile_changes();

-- 4. Create trigger for crm_team_members
CREATE OR REPLACE FUNCTION public.notify_team_members_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_team_name TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_id;
        PERFORM public.create_notification(
            NEW.user_id,
            'Added to Team',
            'You have been added to the team: ' || COALESCE(v_team_name, 'Unknown Team') || '.',
            'info',
            'NORMAL',
            '/profile',
            'team_added',
            NEW.team_id,
            'team_added_' || NEW.team_id || '_' || extract(epoch from now())::int
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.role != OLD.role THEN
            SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_id;
            PERFORM public.create_notification(
                NEW.user_id,
                'Team Role Updated',
                'Your role in team ' || COALESCE(v_team_name, '') || ' has been updated to ' || NEW.role || '.',
                'info',
                'NORMAL',
                '/profile',
                'team_role_update',
                NEW.team_id,
                'team_role_update_' || NEW.team_id || '_' || extract(epoch from now())::int
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_team_members_changes_insert ON public.team_members;
CREATE TRIGGER trigger_notify_team_members_changes_insert
AFTER INSERT ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_members_changes();

DROP TRIGGER IF EXISTS trigger_notify_team_members_changes_update ON public.team_members;
CREATE TRIGGER trigger_notify_team_members_changes_update
AFTER UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_members_changes();
