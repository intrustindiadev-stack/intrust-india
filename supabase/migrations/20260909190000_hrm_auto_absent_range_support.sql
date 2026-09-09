-- ============================================================================
-- MIGRATION: 20260909190000_hrm_auto_absent_range_support.sql
-- Description: Enable date-range support for auto_mark_absent_attendance RPC
-- Author: Intrust Engineering
-- ============================================================================

-- Drop old single-date overload to avoid ambiguous function call resolution
DROP FUNCTION IF EXISTS public.auto_mark_absent_attendance(date);

-- Create new overloaded auto_mark_absent_attendance supporting date ranges & historical months
CREATE OR REPLACE FUNCTION public.auto_mark_absent_attendance(
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_policy record;
    v_now timestamptz := now();
    v_start_date date;
    v_end_date date;
    v_max_date date;
    v_curr_date date;
    v_day_of_week int;
    v_holiday_name text;
    v_active_emp record;
    v_existing_att record;
    v_approved_leave record;
    v_marked_count int := 0;
    v_skipped_count int := 0;
    v_days_processed int := 0;
    v_actor_id uuid;
    v_check_in timestamptz;
    v_check_out timestamptz;
BEGIN
    v_actor_id := auth.uid();

    SELECT * INTO v_policy FROM public.organization_policy LIMIT 1;
    IF v_policy.id IS NULL THEN
        RAISE EXCEPTION 'Organization policy not configured';
    END IF;

    -- Yesterday in policy timezone is the latest completed date that can be processed
    v_max_date := ((v_now AT TIME ZONE v_policy.timezone)::date) - 1;

    -- Determine date range
    IF p_start_date IS NOT NULL THEN
        v_start_date := p_start_date;
    ELSE
        v_start_date := v_max_date;
    END IF;

    IF p_end_date IS NOT NULL THEN
        v_end_date := LEAST(p_end_date, v_max_date);
    ELSE
        v_end_date := LEAST(v_start_date, v_max_date);
    END IF;

    -- If range start is in future, nothing to do
    IF v_start_date > v_max_date THEN
        RETURN jsonb_build_object(
            'success', true,
            'skipped', true,
            'reason', 'date_in_future_or_today',
            'marked_count', 0
        );
    END IF;

    -- Loop over each day in the date range
    v_curr_date := v_start_date;
    WHILE v_curr_date <= v_end_date LOOP
        v_days_processed := v_days_processed + 1;
        v_day_of_week := EXTRACT(DOW FROM v_curr_date)::int; -- 0 = Sunday, 6 = Saturday

        -- 1. Check weekly off
        IF v_policy.weekend_days IS NOT NULL AND v_day_of_week = ANY(v_policy.weekend_days) THEN
            v_curr_date := v_curr_date + 1;
            CONTINUE;
        END IF;

        -- 2. Check configured holiday
        SELECT name INTO v_holiday_name
        FROM public.holidays
        WHERE holiday_date = v_curr_date
          AND scope IN ('all', 'employee')
          AND is_optional = false
        LIMIT 1;

        IF v_holiday_name IS NOT NULL THEN
            v_curr_date := v_curr_date + 1;
            CONTINUE;
        END IF;

        -- Timestamps for closed absent shift
        v_check_in := ((v_curr_date::text || ' ' || v_policy.standard_start_time::text)::timestamp AT TIME ZONE v_policy.timezone);
        v_check_out := ((v_curr_date::text || ' ' || v_policy.standard_end_time::text)::timestamp AT TIME ZONE v_policy.timezone);

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
                (joining_date IS NOT NULL AND joining_date <= v_curr_date)
                OR (joining_date IS NULL AND (created_at AT TIME ZONE v_policy.timezone)::date <= v_curr_date)
            )
        LOOP
            -- Check if attendance exists
            SELECT id INTO v_existing_att
            FROM public.attendance
            WHERE employee_id = v_active_emp.id
              AND (work_date = v_curr_date OR date = v_curr_date)
            LIMIT 1;

            IF v_existing_att.id IS NOT NULL THEN
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- Check if approved leave exists
            SELECT id INTO v_approved_leave
            FROM public.leave_requests
            WHERE employee_id = v_active_emp.id
              AND status = 'approved'
              AND from_date <= v_curr_date
              AND to_date >= v_curr_date
            LIMIT 1;

            IF v_approved_leave.id IS NOT NULL THEN
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- Insert ABSENT record (closed shift timestamps, idempotent ON CONFLICT)
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
                v_curr_date,
                v_curr_date,
                v_check_in,
                v_check_out,
                'absent',
                'automatic',
                'Server-side auto-absent: No attendance recorded on chargeable working day'
            )
            ON CONFLICT (employee_id, date) DO NOTHING;

            v_marked_count := v_marked_count + 1;
        END LOOP;

        v_curr_date := v_curr_date + 1;
    END LOOP;

    -- Write audit log if any records marked
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
                'start_date', v_start_date,
                'end_date', v_end_date,
                'days_processed', v_days_processed,
                'marked_absent_count', v_marked_count,
                'skipped_count', v_skipped_count
            ),
            'Attendance',
            'medium'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'days_processed', v_days_processed,
        'marked_count', v_marked_count,
        'skipped_count', v_skipped_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_mark_absent_attendance(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_mark_absent_attendance(date, date) TO service_role;
