-- Replace submit_leave_request to simplify the overlap error message for employees.

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
    v_actor_role text;
    v_policy_year int;
    v_year_rec record;
    v_policy_rec record;
    v_breakdown jsonb;
    v_chargeable numeric(5,2);
    v_overlap int;
    v_balance record;
    v_initial_status text;
    v_request record;
    v_available numeric(6,2);
    v_consec_days numeric(6,2);
    v_notice_days int;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();
    ELSE
        v_actor_id := p_employee_id;
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Actor identity missing.';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'User profile not found.';
    END IF;

    IF p_to_date < p_from_date THEN
        RAISE EXCEPTION 'End date cannot be earlier than start date.';
    END IF;

    v_policy_year := EXTRACT(YEAR FROM p_from_date)::int;

    SELECT * INTO v_year_rec FROM public.leave_policy_years 
    WHERE policy_year = v_policy_year AND status = 'published';

    IF v_year_rec.id IS NULL THEN
        RAISE EXCEPTION 'Leave policy year % is not configured or not published.', v_policy_year;
    END IF;

    SELECT * INTO v_policy_rec FROM public.leave_policies 
    WHERE policy_year_id = v_year_rec.id AND leave_type_key = p_leave_type AND is_active = true;

    IF v_policy_rec.id IS NULL THEN
        RAISE EXCEPTION 'Leave type "%" is not active or configured for policy year %.', p_leave_type, v_policy_year;
    END IF;

    v_notice_days := (p_from_date - CURRENT_DATE)::int;
    -- MIN NOTICE DAYS CHECK REMOVED

    v_breakdown := public.calculate_leave_days_breakdown(p_from_date, p_to_date, v_actor_id);
    v_chargeable := (v_breakdown->>'chargeable_days')::numeric;

    IF v_chargeable <= 0 AND v_policy_rec.requires_balance THEN
        RAISE EXCEPTION 'Selected date range contains 0 chargeable work days.';
    END IF;

    v_consec_days := (v_breakdown->>'calendar_days')::numeric;
    -- MAX CONSECUTIVE DAYS CHECK REMOVED

    SELECT COUNT(*) INTO v_overlap
    FROM public.leave_requests
    WHERE employee_id = v_actor_id
      AND status IN ('pending_hr_review', 'pending_admin_confirmation', 'approved')
      AND (from_date <= p_to_date AND to_date >= p_from_date);

    IF v_overlap > 0 THEN
        RAISE EXCEPTION 'You already have a leave request pending for these dates.';
    END IF;

    IF v_policy_rec.requires_balance THEN
        SELECT * INTO v_balance 
        FROM public.employee_leave_balances 
        WHERE employee_id = v_actor_id AND policy_year = v_policy_year AND leave_type = p_leave_type
        FOR UPDATE;

        IF v_balance.id IS NULL THEN
            INSERT INTO public.employee_leave_balances (
                employee_id, policy_year, leave_type, policy_id, entitled_days
            ) VALUES (
                v_actor_id, v_policy_year, p_leave_type, v_policy_rec.id, v_policy_rec.annual_entitlement
            )
            ON CONFLICT (employee_id, policy_year, leave_type) DO NOTHING;

            SELECT * INTO v_balance 
            FROM public.employee_leave_balances 
            WHERE employee_id = v_actor_id AND policy_year = v_policy_year AND leave_type = p_leave_type
            FOR UPDATE;
        END IF;

        -- BALANCE CHECK REMOVED
        -- We allow submission regardless of available balance.
        -- reserved_days will increase, potentially causing available balance to go negative, which is expected.

        UPDATE public.employee_leave_balances
        SET 
            reserved_days = reserved_days + v_chargeable,
            version = version + 1,
            updated_at = now()
        WHERE id = v_balance.id;
    END IF;

    IF v_actor_role = 'hr_manager' THEN
        v_initial_status := 'pending_admin_confirmation';
    ELSE
        v_initial_status := 'pending_hr_review';
    END IF;

    INSERT INTO public.leave_requests (
        employee_id, policy_id, leave_type, from_date, to_date, reason,
        status, requested_days, chargeable_days, calendar_breakdown, policy_year,
        requester_role_snapshot
    ) VALUES (
        v_actor_id, v_policy_rec.id, p_leave_type, p_from_date, p_to_date, p_reason,
        v_initial_status, (v_breakdown->>'calendar_days')::numeric, v_chargeable, v_breakdown, v_policy_year,
        v_actor_role
    ) RETURNING * INTO v_request;

    INSERT INTO public.leave_request_actions (
        leave_request_id, actor_id, actor_role, action, from_status, to_status, note
    ) VALUES (
        v_request.id, v_actor_id, v_actor_role, 'submitted', NULL, v_initial_status, p_reason
    );

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
    VALUES (
        v_actor_id, 'Leave request submitted', 'leave_requests', v_request.id,
        jsonb_build_object('leave_type', p_leave_type, 'from_date', p_from_date, 'to_date', p_to_date, 'chargeable_days', v_chargeable, 'status', v_initial_status),
        'Leaves', 'low'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_request));
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_leave_request TO authenticated;
