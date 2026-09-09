-- ============================================================================
-- MIGRATION: 20260909180000_hrm_auto_absent_and_payroll_functions.sql
-- Description: Server-side auto-absent RPC, weekly-off alignment, and audit logging
-- Author: Intrust Engineering
-- ============================================================================

-- 1. Align organization_policy weekend_days to [0] (Sunday) if previously [0, 6]
UPDATE public.organization_policy
SET weekend_days = ARRAY[0],
    updated_at = now()
WHERE weekend_days = ARRAY[0, 6];

-- 2. Create or replace atomic auto_mark_absent_attendance RPC
CREATE OR REPLACE FUNCTION public.auto_mark_absent_attendance(
    p_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_policy record;
    v_now timestamptz := now();
    v_target_date date;
    v_day_of_week int;
    v_holiday_name text;
    v_active_emp record;
    v_existing_att record;
    v_approved_leave record;
    v_marked_count int := 0;
    v_skipped_count int := 0;
    v_actor_id uuid;
    v_check_in timestamptz;
    v_check_out timestamptz;
BEGIN
    -- Actor for audit logging (auth.uid() if authenticated session, NULL if cron/service_role)
    v_actor_id := auth.uid();

    -- Load organization policy
    SELECT * INTO v_policy FROM public.organization_policy LIMIT 1;
    IF v_policy.id IS NULL THEN
        RAISE EXCEPTION 'Organization policy not configured';
    END IF;

    -- Determine target date: if not supplied, defaults to yesterday in policy timezone
    IF p_date IS NOT NULL THEN
        v_target_date := p_date;
    ELSE
        v_target_date := ((v_now AT TIME ZONE v_policy.timezone)::date) - 1;
    END IF;

    -- 1. Check if target date is a weekly off (e.g. Sunday or in weekend_days)
    v_day_of_week := EXTRACT(DOW FROM v_target_date)::int; -- 0 = Sunday, 6 = Saturday
    IF v_policy.weekend_days IS NOT NULL AND v_day_of_week = ANY(v_policy.weekend_days) THEN
        RETURN jsonb_build_object(
            'success', true,
            'date', v_target_date,
            'skipped', true,
            'reason', 'weekly_off',
            'day_of_week', v_day_of_week,
            'marked_count', 0
        );
    END IF;

    -- 2. Check if target date is a configured holiday
    SELECT name INTO v_holiday_name
    FROM public.holidays
    WHERE holiday_date = v_target_date
      AND scope IN ('all', 'employee')
      AND is_optional = false
    LIMIT 1;

    IF v_holiday_name IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'date', v_target_date,
            'skipped', true,
            'reason', 'holiday',
            'holiday_name', v_holiday_name,
            'marked_count', 0
        );
    END IF;

    -- Standard closed shift timestamps for absent records (so check_out IS NOT NULL, avoiding open shift unique index collision)
    v_check_in := ((v_target_date::text || ' ' || v_policy.standard_start_time::text)::timestamp AT TIME ZONE v_policy.timezone);
    v_check_out := ((v_target_date::text || ' ' || v_policy.standard_end_time::text)::timestamp AT TIME ZONE v_policy.timezone);

    -- 3. Loop over all active internal employees
    FOR v_active_emp IN
        SELECT id, full_name, role, joining_date, created_at
        FROM public.user_profiles
        WHERE role IN (
            'employee', 'relationship_exec', 'relationship_manager', 'hr_manager',
            'freelancer', 'video_editor', 'social_media_manager',
            'seo_specialist', 'advertiser', 'support_agent'
        )
        AND is_suspended IS NOT TRUE
        AND (
            (joining_date IS NOT NULL AND joining_date <= v_target_date)
            OR (joining_date IS NULL AND (created_at AT TIME ZONE v_policy.timezone)::date <= v_target_date)
        )
    LOOP
        -- Check if attendance already exists for target date
        SELECT id INTO v_existing_att
        FROM public.attendance
        WHERE employee_id = v_active_emp.id
          AND (work_date = v_target_date OR date = v_target_date)
        LIMIT 1;

        IF v_existing_att.id IS NOT NULL THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Check if employee is on approved leave on target date
        SELECT id INTO v_approved_leave
        FROM public.leave_requests
        WHERE employee_id = v_active_emp.id
          AND status = 'approved'
          AND from_date <= v_target_date
          AND to_date >= v_target_date
        LIMIT 1;

        IF v_approved_leave.id IS NOT NULL THEN
            v_skipped_count := v_skipped_count + 1;
            CONTINUE;
        END IF;

        -- Insert ABSENT attendance record (closed record with check_out set, idempotent ON CONFLICT)
        INSERT INTO public.attendance (
            employee_id,
            date,
            work_date,
            check_in,
            check_out,
            status,
            closure_source,
            closure_reason
        ) VALUES (
            v_active_emp.id,
            v_target_date,
            v_target_date,
            v_check_in,
            v_check_out,
            'absent',
            'automatic',
            'Server-side auto-absent: No attendance recorded on chargeable working day'
        )
        ON CONFLICT (employee_id, date) DO NOTHING;

        v_marked_count := v_marked_count + 1;
    END LOOP;

    -- Audit log
    IF v_marked_count > 0 THEN
        INSERT INTO public.audit_logs_hrm (
            actor_id,
            action,
            table_name,
            record_id,
            new_data,
            module,
            severity
        ) VALUES (
            v_actor_id,
            'Auto-absent executed',
            'attendance',
            NULL,
            jsonb_build_object(
                'target_date', v_target_date,
                'marked_absent_count', v_marked_count,
                'skipped_count', v_skipped_count
            ),
            'Attendance',
            'medium'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'marked_count', v_marked_count,
        'skipped_count', v_skipped_count
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.auto_mark_absent_attendance(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_mark_absent_attendance(date) TO service_role;
