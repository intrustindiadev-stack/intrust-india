-- Migration to add columns to notifications table and create triggers for automated notification logic.

-- 1. Extend public.notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2. Helper function to create notification with duplicate prevention
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_type TEXT,
    p_priority TEXT,
    p_action_url TEXT,
    p_reference_type TEXT,
    p_reference_id UUID,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_recent_count INT;
BEGIN
    -- Prevent duplicate if idempotency_key is provided
    IF p_idempotency_key IS NOT NULL THEN
        SELECT count(*) INTO v_recent_count
        FROM public.notifications
        WHERE user_id = p_user_id
          AND reference_id = p_reference_id
          AND reference_type = p_reference_type
          AND metadata->>'idempotency_key' = p_idempotency_key;

        IF v_recent_count > 0 THEN
            RETURN;
        END IF;
    ELSE
        -- Time-based duplicate prevention (e.g. within last 1 hour for same event type)
        SELECT count(*) INTO v_recent_count
        FROM public.notifications
        WHERE user_id = p_user_id
          AND reference_id = p_reference_id
          AND reference_type = p_reference_type
          AND created_at > (NOW() - INTERVAL '1 hour');

        IF v_recent_count > 0 THEN
            RETURN;
        END IF;
    END IF;

    -- Insert notification
    INSERT INTO public.notifications (
        user_id, title, body, type, priority, action_url, reference_type, reference_id, metadata
    ) VALUES (
        p_user_id, p_title, p_body, COALESCE(p_type, 'info'), COALESCE(p_priority, 'NORMAL'), p_action_url, p_reference_type, p_reference_id, 
        CASE WHEN p_idempotency_key IS NOT NULL THEN jsonb_build_object('idempotency_key', p_idempotency_key) ELSE NULL END
    );
END;
$$;

-- 3. CRM Leads Trigger
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
    -- Case 2: Sent to Team Pool
    ELSIF NEW.assigned_to IS NULL AND NEW.assigned_team_id IS NOT NULL AND (OLD.assigned_team_id IS NULL OR OLD.assigned_to IS NOT NULL) THEN
        -- Find manager(s) of the team
        FOR v_manager_id IN 
            SELECT user_id FROM public.crm_team_members WHERE team_id = NEW.assigned_team_id AND role IN ('manager', 'lead', 'admin')
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
                'pool_' || NEW.assigned_team_id || '_' || extract(epoch from now())::int
            );
        END LOOP;
    END IF;

    -- Case 3: Converted (if status changed to 'converted' or 'won')
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

DROP TRIGGER IF EXISTS trigger_notify_crm_lead_changes ON public.crm_leads;
CREATE TRIGGER trigger_notify_crm_lead_changes
AFTER UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_crm_lead_changes();

-- 4. CRM Tasks Trigger
CREATE OR REPLACE FUNCTION public.notify_crm_task_changes()
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
                '/admin/crm/leads/' || NEW.lead_id || '?tab=tasks',
                'crm_task_assigned',
                NEW.id,
                'assigned_' || extract(epoch from now())::int
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
                '/admin/crm/leads/' || NEW.lead_id || '?tab=tasks',
                'crm_task_reassigned',
                NEW.id,
                'reassigned_' || NEW.assigned_to || '_' || extract(epoch from now())::int
            );
        END IF;
        
        -- Completion (Notify Lead Owner if different from assigned_to)
        IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
            -- Get lead owner
            DECLARE v_lead_owner UUID;
            BEGIN
                SELECT assigned_to INTO v_lead_owner FROM public.crm_leads WHERE id = NEW.lead_id;
                IF v_lead_owner IS NOT NULL AND v_lead_owner != NEW.assigned_to THEN
                    PERFORM public.create_notification(
                        v_lead_owner,
                        'Task Completed',
                        'Task: ' || NEW.title || ' has been completed.',
                        'success',
                        'NORMAL',
                        '/admin/crm/leads/' || NEW.lead_id || '?tab=tasks',
                        'crm_task_completed',
                        NEW.id,
                        'completed_' || extract(epoch from now())::int
                    );
                END IF;
            END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_crm_task_changes_insert ON public.crm_tasks;
CREATE TRIGGER trigger_notify_crm_task_changes_insert
AFTER INSERT ON public.crm_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_crm_task_changes();

DROP TRIGGER IF EXISTS trigger_notify_crm_task_changes_update ON public.crm_tasks;
CREATE TRIGGER trigger_notify_crm_task_changes_update
AFTER UPDATE ON public.crm_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_crm_task_changes();

-- 5. HRM Leave Requests Trigger
CREATE OR REPLACE FUNCTION public.notify_hrm_leave_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_hr_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Notify HR/Managers
        FOR v_hr_id IN 
            SELECT id FROM public.user_profiles WHERE role IN ('hr', 'hr_manager', 'admin', 'super_admin')
        LOOP
            PERFORM public.create_notification(
                v_hr_id,
                'New Leave Request',
                'An employee has requested ' || NEW.leave_type || ' leave.',
                'info',
                'NORMAL',
                '/admin/hrm/leaves',
                'hrm_leave_request',
                NEW.id,
                'requested_' || NEW.id || '_' || extract(epoch from now())::int
            );
        END LOOP;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
            PERFORM public.create_notification(
                NEW.employee_id,
                'Leave Request ' || INITCAP(NEW.status::text),
                'Your ' || NEW.leave_type || ' leave request has been ' || NEW.status || '.',
                CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'error' END,
                'HIGH',
                '/employee/leaves',
                'hrm_leave_' || NEW.status,
                NEW.id,
                'status_' || NEW.status || '_' || NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_hrm_leave_requests_insert ON public.leave_requests;
CREATE TRIGGER trigger_notify_hrm_leave_requests_insert
AFTER INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_hrm_leave_requests();

DROP TRIGGER IF EXISTS trigger_notify_hrm_leave_requests_update ON public.leave_requests;
CREATE TRIGGER trigger_notify_hrm_leave_requests_update
AFTER UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_hrm_leave_requests();
