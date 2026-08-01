-- ============================================================================
-- MIGRATION: 20260801160000_production_harden_hrm_attendance_and_leaves.sql
-- Description: Production Harden Attendance & Leaves, Canonical Model, Atomic RPCs, RLS Security
-- Author: Intrust Engineering
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MIGRATION PREFLIGHT BLOCK
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        RAISE EXCEPTION 'Preflight check failed: user_profiles table is missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
        RAISE EXCEPTION 'Preflight check failed: attendance table is missing.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
        RAISE EXCEPTION 'Preflight check failed: leave_requests table is missing.';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. DATA NORMALIZATION (Existing Leave Types -> Canonical Keys)
-- ----------------------------------------------------------------------------
UPDATE public.leave_requests
SET leave_type = 'casual'
WHERE leave_type IN ('Casual Leave', 'casual');

UPDATE public.leave_requests
SET leave_type = 'sick'
WHERE leave_type IN ('Sick Leave', 'sick');

UPDATE public.leave_requests
SET leave_type = 'earned'
WHERE leave_type IN ('Earned Leave', 'earned');

UPDATE public.leave_requests
SET leave_type = 'unpaid'
WHERE leave_type IN ('Other', 'unpaid', 'Unpaid Leave');

UPDATE public.leave_requests
SET leave_type = 'maternity'
WHERE leave_type IN ('Maternity Leave', 'Maternity', 'maternity');

UPDATE public.leave_requests
SET leave_type = 'paternity'
WHERE leave_type IN ('Paternity Leave', 'Paternity', 'paternity');

-- ----------------------------------------------------------------------------
-- 3. ORGANIZATION POLICY TABLE & SEED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_policy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    timezone text NOT NULL DEFAULT 'Asia/Kolkata',
    standard_start_time time NOT NULL DEFAULT '09:30:00',
    standard_end_time time NOT NULL DEFAULT '18:30:00',
    grace_minutes integer NOT NULL DEFAULT 15,
    maximum_shift_minutes integer NOT NULL DEFAULT 840, -- 14 hours
    stale_shift_cutoff_time time NOT NULL DEFAULT '04:00:00',
    weekend_days integer[] NOT NULL DEFAULT ARRAY[0, 6], -- 0=Sunday, 6=Saturday
    geofence_required boolean NOT NULL DEFAULT false,
    allow_offsite boolean NOT NULL DEFAULT true,
    office_lat numeric(10, 7) DEFAULT 19.0760,
    office_lng numeric(10, 7) DEFAULT 72.8777,
    geofence_radius_meters integer DEFAULT 300,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.organization_policy (
    timezone, standard_start_time, standard_end_time, grace_minutes,
    maximum_shift_minutes, stale_shift_cutoff_time, weekend_days,
    geofence_required, allow_offsite, office_lat, office_lng, geofence_radius_meters
)
SELECT 
    'Asia/Kolkata', '09:30:00', '18:30:00', 15, 840, '04:00:00', ARRAY[0, 6],
    false, true, 19.0760, 72.8777, 300
WHERE NOT EXISTS (SELECT 1 FROM public.organization_policy);

-- ----------------------------------------------------------------------------
-- 4. HOLIDAYS TABLE SETUP
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date date NOT NULL,
    name text NOT NULL,
    scope text NOT NULL DEFAULT 'all',
    is_optional boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT holidays_date_scope_key UNIQUE (holiday_date, scope)
);

-- Seed basic holidays for current year if table empty
INSERT INTO public.holidays (holiday_date, name, scope, is_optional)
VALUES 
    (MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 1, 26), 'Republic Day', 'all', false),
    (MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 8, 15), 'Independence Day', 'all', false),
    (MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 10, 2), 'Gandhi Jayanti', 'all', false),
    (MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::int, 12, 25), 'Christmas', 'all', false)
ON CONFLICT (holiday_date, scope) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. ATTENDANCE TABLE HARDENING & SHIFT RECONCILIATION
-- ----------------------------------------------------------------------------
-- Add new columns if missing
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS work_date date;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS closure_source text DEFAULT 'employee';
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS closure_reason text;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS check_in_location_status text DEFAULT 'unknown';
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS check_out_location_status text DEFAULT 'unknown';
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Backfill work_date from date column
UPDATE public.attendance SET work_date = date WHERE work_date IS NULL AND date IS NOT NULL;
ALTER TABLE public.attendance ALTER COLUMN work_date SET NOT NULL;

-- Deterministic reconciliation for older open shifts before creating unique index
UPDATE public.attendance
SET 
    check_out = check_in + interval '9 hours',
    closure_source = 'automatic',
    closure_reason = 'Stale shift auto-closed during schema hardening',
    needs_review = true,
    updated_at = now()
WHERE check_in IS NOT NULL 
  AND check_out IS NULL 
  AND work_date < ((now() AT TIME ZONE 'Asia/Kolkata')::date);

-- Create partial unique index enforcing at most one open shift per employee
DROP INDEX IF EXISTS public.idx_attendance_one_open_shift;
CREATE UNIQUE INDEX idx_attendance_one_open_shift 
ON public.attendance (employee_id) 
WHERE check_out IS NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_emp_workdate_desc 
ON public.attendance (employee_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_workdate_status 
ON public.attendance (work_date, status);

-- Constraints
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS chk_attendance_check_out;
ALTER TABLE public.attendance ADD CONSTRAINT chk_attendance_check_out 
CHECK (check_out IS NULL OR check_out >= check_in);

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS chk_attendance_lat_lng;
ALTER TABLE public.attendance ADD CONSTRAINT chk_attendance_lat_lng 
CHECK (
    (check_in_lat IS NULL OR check_in_lat BETWEEN -90 AND 90) AND
    (check_in_lng IS NULL OR check_in_lng BETWEEN -180 AND 180) AND
    (check_out_lat IS NULL OR check_out_lat BETWEEN -90 AND 90) AND
    (check_out_lng IS NULL OR check_out_lng BETWEEN -180 AND 180)
);

-- ----------------------------------------------------------------------------
-- 6. CANONICAL EMPLOYEE LEAVE BALANCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_leave_balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    policy_year integer NOT NULL,
    leave_type text NOT NULL,
    entitled_days numeric(5,2) NOT NULL DEFAULT 0,
    carried_forward_days numeric(5,2) NOT NULL DEFAULT 0,
    accrued_days numeric(5,2) NOT NULL DEFAULT 0,
    used_days numeric(5,2) NOT NULL DEFAULT 0,
    reserved_days numeric(5,2) NOT NULL DEFAULT 0,
    adjustment_days numeric(5,2) NOT NULL DEFAULT 0,
    version integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_emp_year_leavetype UNIQUE (employee_id, policy_year, leave_type)
);

CREATE INDEX IF NOT EXISTS idx_emp_leave_bal_emp_year 
ON public.employee_leave_balances (employee_id, policy_year);

-- ----------------------------------------------------------------------------
-- 7. LEAVE REQUESTS TABLE HARDENING
-- ----------------------------------------------------------------------------
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS requested_days numeric(5,2);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS chargeable_days numeric(5,2);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS calendar_breakdown jsonb;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS policy_year integer;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;

-- Backfill policy_year for leave_requests
UPDATE public.leave_requests 
SET policy_year = EXTRACT(YEAR FROM from_date)::int 
WHERE policy_year IS NULL;

-- ----------------------------------------------------------------------------
-- 8. ATOMIC BUSINESS RPC FUNCTIONS
-- ----------------------------------------------------------------------------

-- Helper: Calculate Leave Days Breakdown
CREATE OR REPLACE FUNCTION public.calculate_leave_days_breakdown(
    p_from_date date,
    p_to_date date,
    p_employee_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_curr_date date;
    v_cal_days int := 0;
    v_weekend_days int := 0;
    v_holiday_days int := 0;
    v_chargeable_days int := 0;
    v_day_of_week int;
    v_holiday_name text;
    v_holidays_json jsonb := '[]'::jsonb;
    v_weekends_json jsonb := '[]'::jsonb;
BEGIN
    IF p_to_date < p_from_date THEN
        RAISE EXCEPTION 'End date must be greater than or equal to start date.';
    END IF;

    v_curr_date := p_from_date;
    WHILE v_curr_date <= p_to_date LOOP
        v_cal_days := v_cal_days + 1;
        v_day_of_week := EXTRACT(DOW FROM v_curr_date)::int; -- 0=Sunday, 6=Saturday

        -- Check holiday
        SELECT name INTO v_holiday_name 
        FROM public.holidays 
        WHERE holiday_date = v_curr_date AND scope IN ('all', 'employee') AND is_optional = false
        LIMIT 1;

        IF v_holiday_name IS NOT NULL THEN
            v_holiday_days := v_holiday_days + 1;
            v_holidays_json := v_holidays_json || jsonb_build_object('date', v_curr_date, 'name', v_holiday_name);
        ELSIF v_day_of_week = 0 OR v_day_of_week = 6 THEN
            v_weekend_days := v_weekend_days + 1;
            v_weekends_json := v_weekends_json || jsonb_build_object('date', v_curr_date, 'day', TRIM(TO_CHAR(v_curr_date, 'Day')));
        ELSE
            v_chargeable_days := v_chargeable_days + 1;
        END IF;

        v_curr_date := v_curr_date + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'calendar_days', v_cal_days,
        'weekend_days', v_weekend_days,
        'holiday_days', v_holiday_days,
        'chargeable_days', v_chargeable_days,
        'holidays', v_holidays_json,
        'weekends', v_weekends_json
    );
END;
$$;

-- Atomic Clock-In RPC
CREATE OR REPLACE FUNCTION public.clock_in_attendance(
    p_lat numeric DEFAULT NULL,
    p_lng numeric DEFAULT NULL
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
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call';
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
        -- If already clocked in today, return idempotently
        IF v_existing.work_date = v_work_date THEN
            RETURN jsonb_build_object('success', true, 'record', row_to_json(v_existing), 'idempotent', true);
        ELSE
            -- Existing shift from a previous date is open: auto-close as stale
            UPDATE public.attendance
            SET 
                check_out = v_existing.check_in + interval '9 hours',
                closure_source = 'automatic',
                closure_reason = 'Previous shift left open; auto-closed on new clock-in',
                needs_review = true,
                updated_at = v_now
            WHERE id = v_existing.id;

            -- Log audit
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
        -- Haversine formula approximation in meters
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

    -- Enforce geofence policy if strictly required
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

    -- Write Audit Log
    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
    VALUES (
        v_actor_id, 'Clocked in', 'attendance', v_record.id,
        jsonb_build_object('work_date', v_work_date, 'check_in', v_now, 'status', v_status, 'is_onsite', v_is_onsite),
        'Attendance', 'low'
    );

    RETURN jsonb_build_object('success', true, 'record', row_to_json(v_record));
END;
$$;

-- Atomic Clock-Out RPC
CREATE OR REPLACE FUNCTION public.clock_out_attendance(
    p_lat numeric DEFAULT NULL,
    p_lng numeric DEFAULT NULL
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
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call';
    END IF;

    -- Locate open shift
    SELECT * INTO v_existing FROM public.attendance 
    WHERE employee_id = v_actor_id AND check_out IS NULL 
    LIMIT 1;

    IF v_existing.id IS NULL THEN
        -- Check if already clocked out today
        SELECT * INTO v_existing FROM public.attendance 
        WHERE employee_id = v_actor_id AND work_date = ((v_now AT TIME ZONE 'Asia/Kolkata')::date) AND check_out IS NOT NULL 
        LIMIT 1;

        IF v_existing.id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'record', row_to_json(v_existing), 'idempotent', true);
        END IF;

        RAISE EXCEPTION 'No active open shift found to clock out.';
    END IF;

    -- Geofence status for clock out
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

    -- Atomic update
    UPDATE public.attendance
    SET 
        check_out = v_now,
        check_out_lat = p_lat,
        check_out_lng = p_lng,
        check_out_location_status = v_location_status,
        updated_at = v_now
    WHERE id = v_existing.id
    RETURNING * INTO v_record;

    -- Write Audit Log
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

-- Atomic Stale Shift Closure RPC
CREATE OR REPLACE FUNCTION public.close_stale_attendance()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_count integer := 0;
    v_rec record;
BEGIN
    FOR v_rec IN 
        SELECT a.id, a.employee_id, a.check_in 
        FROM public.attendance a
        WHERE a.check_out IS NULL 
          AND a.work_date < ((now() AT TIME ZONE 'Asia/Kolkata')::date)
    LOOP
        UPDATE public.attendance
        SET 
            check_out = v_rec.check_in + interval '9 hours',
            closure_source = 'automatic',
            closure_reason = 'Stale shift auto-closed at midnight cutoff',
            needs_review = true,
            updated_at = now()
        WHERE id = v_rec.id;

        v_count := v_count + 1;

        INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
        VALUES (
            v_rec.employee_id, 'Stale shift auto-closed', 'attendance', v_rec.id,
            jsonb_build_object('closure_source', 'automatic', 'needs_review', true),
            'Attendance', 'medium'
        );
    END LOOP;

    RETURN v_count;
END;
$$;

-- Atomic HR Override Attendance RPC
CREATE OR REPLACE FUNCTION public.hr_override_attendance(
    p_attendance_id uuid,
    p_status text,
    p_reason text
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
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
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

-- Atomic Submit Leave Request RPC
CREATE OR REPLACE FUNCTION public.submit_leave_request(
    p_leave_type text,
    p_from_date date,
    p_to_date date,
    p_reason text DEFAULT NULL
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
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_leave_type NOT IN ('casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity') THEN
        RAISE EXCEPTION 'Invalid canonical leave type: %', p_leave_type;
    END IF;

    IF p_to_date < p_from_date THEN
        RAISE EXCEPTION 'End date cannot be earlier than start date.';
    END IF;

    v_policy_year := EXTRACT(YEAR FROM p_from_date)::int;

    -- Breakdown calculation
    v_breakdown := public.calculate_leave_days_breakdown(p_from_date, p_to_date, v_actor_id);
    v_chargeable := (v_breakdown->>'chargeable_days')::numeric;

    IF v_chargeable <= 0 AND p_leave_type != 'unpaid' THEN
        RAISE EXCEPTION 'Selected date range contains 0 chargeable work days (only weekends/holidays).';
    END IF;

    -- Detect overlap with existing pending or approved requests
    SELECT COUNT(*) INTO v_overlap
    FROM public.leave_requests
    WHERE employee_id = v_actor_id
      AND status IN ('pending', 'approved')
      AND (from_date <= p_to_date AND to_date >= p_from_date);

    IF v_overlap > 0 THEN
        RAISE EXCEPTION 'Leave request overlaps with an existing pending or approved leave request.';
    END IF;

    -- Balance reservation check for paid leave types
    IF p_leave_type IN ('casual', 'sick', 'earned') THEN
        -- Lock or create balance row for employee & policy year
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

        -- Reserve days atomically
        UPDATE public.employee_leave_balances
        SET 
            reserved_days = reserved_days + v_chargeable,
            version = version + 1,
            updated_at = now()
        WHERE id = v_balance.id;
    END IF;

    -- Insert request
    INSERT INTO public.leave_requests (
        employee_id, leave_type, from_date, to_date, reason,
        status, requested_days, chargeable_days, calendar_breakdown, policy_year
    ) VALUES (
        v_actor_id, p_leave_type, p_from_date, p_to_date, p_reason,
        'pending', (v_breakdown->>'calendar_days')::numeric, v_chargeable, v_breakdown, v_policy_year
    ) RETURNING * INTO v_request;

    -- Audit Log
    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
    VALUES (
        v_actor_id, 'Leave request submitted', 'leave_requests', v_request.id,
        jsonb_build_object('leave_type', p_leave_type, 'from_date', p_from_date, 'to_date', p_to_date, 'chargeable_days', v_chargeable),
        'Leaves', 'low'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_request));
END;
$$;

-- Atomic Review Leave Request RPC (HR Action)
CREATE OR REPLACE FUNCTION public.review_leave_request(
    p_request_id uuid,
    p_action text,
    p_note text DEFAULT NULL
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
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
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

    -- Manage balance transition
    IF v_request.leave_type IN ('casual', 'sick', 'earned') THEN
        SELECT * INTO v_balance 
        FROM public.employee_leave_balances 
        WHERE employee_id = v_request.employee_id 
          AND policy_year = COALESCE(v_request.policy_year, EXTRACT(YEAR FROM v_request.from_date)::int)
          AND leave_type = v_request.leave_type
        FOR UPDATE;

        IF v_balance.id IS NOT NULL THEN
            IF p_action = 'approved' THEN
                -- Move reserved to used
                UPDATE public.employee_leave_balances
                SET 
                    reserved_days = GREATEST(0, reserved_days - v_chargeable),
                    used_days = used_days + v_chargeable,
                    version = version + 1,
                    updated_at = now()
                WHERE id = v_balance.id;
            ELSE
                -- Release reserved days
                UPDATE public.employee_leave_balances
                SET 
                    reserved_days = GREATEST(0, reserved_days - v_chargeable),
                    version = version + 1,
                    updated_at = now()
                WHERE id = v_balance.id;
            END IF;
        END IF;
    END IF;

    -- Update request
    UPDATE public.leave_requests
    SET 
        status = p_action,
        reviewed_by = v_actor_id,
        review_note = p_note,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    -- Audit Log
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

-- Atomic Cancel Leave Request RPC
CREATE OR REPLACE FUNCTION public.cancel_leave_request(
    p_request_id uuid,
    p_reason text DEFAULT NULL
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
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
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

    -- Release reservation if paid leave type
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

-- ----------------------------------------------------------------------------
-- 9. SECURITY HARDENING & RLS POLICIES
-- ----------------------------------------------------------------------------

-- A. Revoke ALL from anon role across HRM tables
REVOKE ALL ON public.attendance FROM anon;
REVOKE ALL ON public.leave_requests FROM anon;
REVOKE ALL ON public.leave_balances FROM anon;
REVOKE ALL ON public.employee_leave_balances FROM anon;
REVOKE ALL ON public.holidays FROM anon;
REVOKE ALL ON public.organization_policy FROM anon;
REVOKE ALL ON public.audit_logs_hrm FROM anon;

-- B. Revoke generic UPDATE/INSERT from authenticated on sensitive tables
REVOKE UPDATE, INSERT, DELETE ON public.attendance FROM authenticated;
REVOKE UPDATE, INSERT, DELETE ON public.leave_requests FROM authenticated;

-- C. Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs_hrm ENABLE ROW LEVEL SECURITY;

-- D. Policies for Attendance
DROP POLICY IF EXISTS "employee_view_own_attendance" ON public.attendance;
CREATE POLICY "employee_view_own_attendance" ON public.attendance 
FOR SELECT TO authenticated 
USING (employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('hr_manager', 'admin', 'super_admin')
));

-- E. Policies for Leave Requests
DROP POLICY IF EXISTS "employee_view_own_leaves" ON public.leave_requests;
CREATE POLICY "employee_view_own_leaves" ON public.leave_requests 
FOR SELECT TO authenticated 
USING (employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('hr_manager', 'admin', 'super_admin')
));

-- F. Policies for Leave Balances
DROP POLICY IF EXISTS "employee_view_own_leave_balances" ON public.employee_leave_balances;
CREATE POLICY "employee_view_own_leave_balances" ON public.employee_leave_balances 
FOR SELECT TO authenticated 
USING (employee_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('hr_manager', 'admin', 'super_admin')
));

-- G. Policies for Holidays & Policy
DROP POLICY IF EXISTS "authenticated_read_holidays" ON public.holidays;
CREATE POLICY "authenticated_read_holidays" ON public.holidays 
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_org_policy" ON public.organization_policy;
CREATE POLICY "authenticated_read_org_policy" ON public.organization_policy 
FOR SELECT TO authenticated USING (true);

-- H. RPC Grants
REVOKE EXECUTE ON FUNCTION public.clock_in_attendance FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clock_out_attendance FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.close_stale_attendance FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hr_override_attendance FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_leave_request FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_leave_request FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_leave_request FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_leave_days_breakdown FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.clock_in_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_attendance TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.hr_override_attendance TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_leave_days_breakdown TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
