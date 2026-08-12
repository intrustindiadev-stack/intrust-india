CREATE OR REPLACE FUNCTION public.notify_hrm_leave_requests()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_hr_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Notify HR/Managers
        -- FIXED: Removed 'hr' from the IN clause because it's not a valid user_role enum value
        FOR v_hr_id IN
            SELECT id FROM public.user_profiles WHERE role IN ('hr_manager', 'admin', 'super_admin')
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
$function$;
