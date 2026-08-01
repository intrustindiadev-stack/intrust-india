-- ============================================================================
-- MIGRATION: 20260801170000_fix_hrm_rpc_actor_id_parameter.sql
-- Description: Allow trusted server API routes to pass employee/actor ID to RPCs
-- ============================================================================

DROP FUNCTION IF EXISTS public.clock_in_attendance(numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.clock_in_attendance(numeric, numeric, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.clock_out_attendance(numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.clock_out_attendance(numeric, numeric, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.submit_leave_request(text, date, date, text) CASCADE;
DROP FUNCTION IF EXISTS public.submit_leave_request(text, date, date, text, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.review_leave_request(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.review_leave_request(uuid, text, text, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.cancel_leave_request(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_leave_request(uuid, text, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.hr_override_attendance(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.hr_override_attendance(uuid, text, text, uuid) CASCADE;

-- 1. Clock-In RPC
CREATE OR REPLACE FUNCTION public.clock_in_attendance(
    p_lat numeric DEFAULT NULL,
    p_lng numeric DEFAULT NULL,
    p_employee_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid;
    v_user_role text;
    v_policy record;
    v_now timestamptz := now();
    v_work_date date;
    v_existing record;
    v_dist_meters numeric;
    v_is_onsite boolean := false;
    v_location_status text := 'offsite';
    v_status text := 'present';
    v_record record;
BEGIN
    v_actor_id := COALESCE(p_employee_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call: No authenticated user or employee_id provided.';
    END IF;

    -- Check internal active role
    SELECT role::text INTO v_user_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Load policy
    SELECT * INTO v_policy FROM public.organization_policy LIMIT 1;
    IF v_policy.id IS NULL THEN
        RAISE EXCEPTION 'Organization policy not configured';
    END IF;

    -- Compute local business work date in configured timezone
    v_work_date := (v_now AT TIME ZONE v_policy.timezone)::date;

    -- Check for an open shift for this employee
    SELECT * INTO v_existing FROM public.attendance 
    WHERE employee_id = v_actor_id AND check_out IS NULL 
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        IF v_existing.work_date = v_work_date THEN
            RETURN jsonb_build_object('success', true, 'record', row_to_json(v_existing), 'idempotent', true);
        ELSE
            -- Auto-close previous stale shift
            UPDATE public.attendance
            SET 
                check_out = v_existing.check_in + interval '9 hours',
                closure_source = 'automatic',
                closure_reason = 'Previous shift left open; auto-closed on new clock-in',
                needs_review = true,
                updated_at = v_now
            WHERE id = v_existing.id;

            INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
            VALUES (
                v_actor_id, 'Stale shift auto-closed', 'attendance', v_existing.id,
                jsonb_build_object('check_out', v_existing.check_out),
                jsonb_build_object('check_out', v_existing.check_in + interval '9 hours', 'closure_source', 'automatic'),
                'Attendance', 'medium'
            );
        END IF;
    END IF;

    -- Check if shift for today was already completed
    SELECT * INTO v_existing FROM public.attendance 
    WHERE employee_id = v_actor_id AND work_date = v_work_date AND check_out IS NOT NULL 
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        RAISE EXCEPTION 'Shift for % has already been completed.', v_work_date;
    END IF;

    -- Server-side distance computation for on-site geofencing
    IF p_lat IS NOT NULL AND p_lng IS NOT NULL AND v_policy.office_lat IS NOT NULL AND v_policy.office_lng IS NOT NULL THEN
        v_dist_meters := 6371000 * acos(
            cos(radians(v_policy.office_lat)) * cos(radians(p_lat)) *
            cos(radians(p_lng) - radians(v_policy.office_lng)) +
            sin(radians(v_policy.office_lat)) * sin(radians(p_lat))
        );

        IF v_dist_meters <= v_policy.geofence_radius_meters THEN
            v_is_onsite := true;
            v_location_status := 'onsite';
        ELSE
            v_is_onsite := false;
            v_location_status := 'offsite';
        END IF;
    ELSE
        v_location_status := 'no_gps';
    END IF;

    IF v_policy.geofence_required AND NOT v_is_onsite THEN
        RAISE EXCEPTION 'Clock-in rejected: On-site geofence validation required.';
    END IF;

    -- Late calculation
    IF (v_now AT TIME ZONE v_policy.timezone)::time > (v_policy.standard_start_time + (v_policy.grace_minutes || ' minutes')::interval) THEN
        v_status := 'late';
    ELSE
        v_status := 'present';
    END IF;

    -- Insert attendance record
    INSERT INTO public.attendance (
        employee_id, date, work_date, check_in, status,
        check_in_lat, check_in_lng, is_onsite,
        check_in_location_status, closure_source
    ) VALUES (
        v_actor_id, v_work_date, v_work_date, v_now, v_status,
        p_lat, p_lng, v_is_onsite,
        v_location_status, 'employee'
    ) RETURNING * INTO v_record;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
    VALUES (
        v_actor_id, 'Clocked in', 'attendance', v_record.id,
        jsonb_build_object('work_date', v_work_date, 'check_in', v_now, 'status', v_status, 'is_onsite', v_is_onsite),
        'Attendance', 'low'
    );

    RETURN jsonb_build_object('success', true, 'record', row_to_json(v_record));
END;
$$;

-- 2. Clock-Out RPC
CREATE OR REPLACE FUNCTION public.clock_out_attendance(
    p_lat numeric DEFAULT NULL,
    p_lng numeric DEFAULT NULL,
    p_employee_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid;
    v_policy record;
    v_now timestamptz := now();
    v_existing record;
    v_dist_meters numeric;
    v_location_status text := 'offsite';
    v_record record;
BEGIN
    v_actor_id := COALESCE(p_employee_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call: No authenticated user or employee_id provided.';
    END IF;

    SELECT * INTO v_existing FROM public.attendance 
    WHERE employee_id = v_actor_id AND check_out IS NULL 
    LIMIT 1;

    IF v_existing.id IS NULL THEN
        SELECT * INTO v_existing FROM public.attendance 
        WHERE employee_id = v_actor_id AND work_date = ((v_now AT TIME ZONE 'Asia/Kolkata')::date) AND check_out IS NOT NULL 
        LIMIT 1;

        IF v_existing.id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'record', row_to_json(v_existing), 'idempotent', true);
        END IF;

        RAISE EXCEPTION 'No active open shift found to clock out.';
    END IF;

    SELECT * INTO v_policy FROM public.organization_policy LIMIT 1;
    IF p_lat IS NOT NULL AND p_lng IS NOT NULL AND v_policy.office_lat IS NOT NULL AND v_policy.office_lng IS NOT NULL THEN
        v_dist_meters := 6371000 * acos(
            cos(radians(v_policy.office_lat)) * cos(radians(p_lat)) *
            cos(radians(p_lng) - radians(v_policy.office_lng)) +
            sin(radians(v_policy.office_lat)) * sin(radians(p_lat))
        );
        IF v_dist_meters <= v_policy.geofence_radius_meters THEN
            v_location_status := 'onsite';
        ELSE
            v_location_status := 'offsite';
        END IF;
    ELSE
        v_location_status := 'no_gps';
    END IF;

    UPDATE public.attendance
    SET 
        check_out = v_now,
        check_out_lat = p_lat,
        check_out_lng = p_lng,
        check_out_location_status = v_location_status,
        updated_at = v_now
    WHERE id = v_existing.id
    RETURNING * INTO v_record;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'Clocked out', 'attendance', v_record.id,
        jsonb_build_object('check_in', v_existing.check_in),
        jsonb_build_object('check_out', v_now, 'duration_minutes', EXTRACT(EPOCH FROM (v_now - v_existing.check_in))/60),
        'Attendance', 'low'
    );

    RETURN jsonb_build_object('success', true, 'record', row_to_json(v_record));
END;
$$;

-- 3. Submit Leave Request RPC
CREATE OR REPLACE FUNCTION public.submit_leave_request(
    p_leave_type text,
    p_from_date date,
    p_to_date date,
    p_reason text DEFAULT NULL,
    p_employee_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid;
    v_policy_year int;
    v_breakdown jsonb;
    v_chargeable numeric(5,2);
    v_overlap int;
    v_balance record;
    v_request record;
BEGIN
    v_actor_id := COALESCE(p_employee_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call: No authenticated user or employee_id provided.';
    END IF;

    IF p_leave_type NOT IN ('casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity') THEN
        RAISE EXCEPTION 'Invalid canonical leave type: %', p_leave_type;
    END IF;

    IF p_to_date < p_from_date THEN
        RAISE EXCEPTION 'End date cannot be earlier than start date.';
    END IF;

    v_policy_year := EXTRACT(YEAR FROM p_from_date)::int;

    v_breakdown := public.calculate_leave_days_breakdown(p_from_date, p_to_date, v_actor_id);
    v_chargeable := (v_breakdown->>'chargeable_days')::numeric;

    IF v_chargeable <= 0 AND p_leave_type != 'unpaid' THEN
        RAISE EXCEPTION 'Selected date range contains 0 chargeable work days (only weekends/holidays).';
    END IF;

    SELECT COUNT(*) INTO v_overlap
    FROM public.leave_requests
    WHERE employee_id = v_actor_id
      AND status IN ('pending', 'approved')
      AND (from_date <= p_to_date AND to_date >= p_from_date);

    IF v_overlap > 0 THEN
        RAISE EXCEPTION 'Leave request overlaps with an existing pending or approved leave request.';
    END IF;

    IF p_leave_type IN ('casual', 'sick', 'earned') THEN
        INSERT INTO public.employee_leave_balances (employee_id, policy_year, leave_type, entitled_days)
        VALUES 
            (v_actor_id, v_policy_year, 'casual', 12),
            (v_actor_id, v_policy_year, 'sick', 8),
            (v_actor_id, v_policy_year, 'earned', 21)
        ON CONFLICT (employee_id, policy_year, leave_type) DO NOTHING;

        SELECT * INTO v_balance 
        FROM public.employee_leave_balances 
        WHERE employee_id = v_actor_id AND policy_year = v_policy_year AND leave_type = p_leave_type
        FOR UPDATE;

        IF v_balance.id IS NULL THEN
            RAISE EXCEPTION 'Leave balance unavailable for policy year %.', v_policy_year;
        END IF;

        IF (v_balance.entitled_days + v_balance.carried_forward_days + v_balance.accrued_days + v_balance.adjustment_days - v_balance.used_days - v_balance.reserved_days) < v_chargeable THEN
            RAISE EXCEPTION 'Insufficient leave balance. Available: %, Requested: %', 
                (v_balance.entitled_days + v_balance.carried_forward_days + v_balance.accrued_days + v_balance.adjustment_days - v_balance.used_days - v_balance.reserved_days),
                v_chargeable;
        END IF;

        UPDATE public.employee_leave_balances
        SET 
            reserved_days = reserved_days + v_chargeable,
            version = version + 1,
            updated_at = now()
        WHERE id = v_balance.id;
    END IF;

    INSERT INTO public.leave_requests (
        employee_id, leave_type, from_date, to_date, reason,
        status, requested_days, chargeable_days, calendar_breakdown, policy_year
    ) VALUES (
        v_actor_id, p_leave_type, p_from_date, p_to_date, p_reason,
        'pending', (v_breakdown->>'calendar_days')::numeric, v_chargeable, v_breakdown, v_policy_year
    ) RETURNING * INTO v_request;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
    VALUES (
        v_actor_id, 'Leave request submitted', 'leave_requests', v_request.id,
        jsonb_build_object('leave_type', p_leave_type, 'from_date', p_from_date, 'to_date', p_to_date, 'chargeable_days', v_chargeable),
        'Leaves', 'low'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_request));
END;
$$;

-- 4. Review Leave Request RPC
CREATE OR REPLACE FUNCTION public.review_leave_request(
    p_request_id uuid,
    p_action text,
    p_note text DEFAULT NULL,
    p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid;
    v_actor_role text;
    v_request record;
    v_balance record;
    v_chargeable numeric(5,2);
    v_updated record;
BEGIN
    v_actor_id := COALESCE(p_actor_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_actor_role NOT IN ('hr_manager', 'admin', 'super_admin') THEN
        RAISE EXCEPTION 'Forbidden: Only HR managers or Admins can review leave requests';
    END IF;

    IF p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid review action: %. Must be approved or rejected.', p_action;
    END IF;

    SELECT * INTO v_request FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
    IF v_request.id IS NULL THEN
        RAISE EXCEPTION 'Leave request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Conflict: Leave request has already been processed (status: %).', v_request.status;
    END IF;

    v_chargeable := COALESCE(v_request.chargeable_days, 1);

    IF v_request.leave_type IN ('casual', 'sick', 'earned') THEN
        SELECT * INTO v_balance 
        FROM public.employee_leave_balances 
        WHERE employee_id = v_request.employee_id 
          AND policy_year = COALESCE(v_request.policy_year, EXTRACT(YEAR FROM v_request.from_date)::int)
          AND leave_type = v_request.leave_type
        FOR UPDATE;

        IF v_balance.id IS NOT NULL THEN
            IF p_action = 'approved' THEN
                UPDATE public.employee_leave_balances
                SET 
                    reserved_days = GREATEST(0, reserved_days - v_chargeable),
                    used_days = used_days + v_chargeable,
                    version = version + 1,
                    updated_at = now()
                WHERE id = v_balance.id;
            ELSE
                UPDATE public.employee_leave_balances
                SET 
                    reserved_days = GREATEST(0, reserved_days - v_chargeable),
                    version = version + 1,
                    updated_at = now()
                WHERE id = v_balance.id;
            END IF;
        END IF;
    END IF;

    UPDATE public.leave_requests
    SET 
        status = p_action,
        reviewed_by = v_actor_id,
        review_note = p_note,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'Leave request reviewed', 'leave_requests', p_request_id,
        jsonb_build_object('status', 'pending'),
        jsonb_build_object('status', p_action, 'review_note', p_note, 'reviewed_by', v_actor_id),
        'Leaves', 'medium'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_updated));
END;
$$;

-- 5. Cancel Leave Request RPC
CREATE OR REPLACE FUNCTION public.cancel_leave_request(
    p_request_id uuid,
    p_reason text DEFAULT NULL,
    p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid;
    v_request record;
    v_balance record;
    v_chargeable numeric(5,2);
    v_updated record;
BEGIN
    v_actor_id := COALESCE(p_actor_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call';
    END IF;

    SELECT * INTO v_request FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
    IF v_request.id IS NULL THEN
        RAISE EXCEPTION 'Leave request not found';
    END IF;

    IF v_request.employee_id != v_actor_id THEN
        RAISE EXCEPTION 'Forbidden: You can only cancel your own leave requests.';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Cannot cancel request with status %.', v_request.status;
    END IF;

    v_chargeable := COALESCE(v_request.chargeable_days, 1);

    IF v_request.leave_type IN ('casual', 'sick', 'earned') THEN
        SELECT * INTO v_balance 
        FROM public.employee_leave_balances 
        WHERE employee_id = v_actor_id 
          AND policy_year = COALESCE(v_request.policy_year, EXTRACT(YEAR FROM v_request.from_date)::int)
          AND leave_type = v_request.leave_type
        FOR UPDATE;

        IF v_balance.id IS NOT NULL THEN
            UPDATE public.employee_leave_balances
            SET 
                reserved_days = GREATEST(0, reserved_days - v_chargeable),
                version = version + 1,
                updated_at = now()
            WHERE id = v_balance.id;
        END IF;
    END IF;

    UPDATE public.leave_requests
    SET 
        status = 'cancelled',
        cancelled_by = v_actor_id,
        cancelled_at = now(),
        cancel_reason = p_reason,
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'Leave request cancelled', 'leave_requests', p_request_id,
        jsonb_build_object('status', 'pending'),
        jsonb_build_object('status', 'cancelled', 'cancel_reason', p_reason),
        'Leaves', 'low'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_updated));
END;
$$;

-- 6. HR Override Attendance RPC
CREATE OR REPLACE FUNCTION public.hr_override_attendance(
    p_attendance_id uuid,
    p_status text,
    p_reason text,
    p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_actor_id uuid;
    v_actor_role text;
    v_existing record;
    v_updated record;
BEGIN
    v_actor_id := COALESCE(p_actor_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_actor_role NOT IN ('hr_manager', 'admin', 'super_admin') THEN
        RAISE EXCEPTION 'Forbidden: Only HR or Admins can override attendance';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Override reason is required for audit trail.';
    END IF;

    SELECT * INTO v_existing FROM public.attendance WHERE id = p_attendance_id FOR UPDATE;
    IF v_existing.id IS NULL THEN
        RAISE EXCEPTION 'Attendance record not found';
    END IF;

    UPDATE public.attendance
    SET 
        status = p_status,
        override_by = v_actor_id,
        override_reason = p_reason,
        needs_review = false,
        updated_at = now()
    WHERE id = p_attendance_id
    RETURNING * INTO v_updated;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'Attendance overridden', 'attendance', p_attendance_id,
        jsonb_build_object('status', v_existing.status),
        jsonb_build_object('status', p_status, 'override_reason', p_reason, 'override_by', v_actor_id),
        'Attendance', 'medium'
    );

    RETURN jsonb_build_object('success', true, 'record', row_to_json(v_updated));
END;
$$;

GRANT EXECUTE ON FUNCTION public.clock_in_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_override_attendance TO authenticated;
