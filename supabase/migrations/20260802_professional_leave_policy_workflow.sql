-- ============================================================================
-- MIGRATION: 20260802_professional_leave_policy_workflow.sql
-- Description: Multi-stage Leave Policy & Workflow, Concurrency Controls, RLS & RPCs
-- Author: Intrust Engineering
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PREFLIGHT CHECKS
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        RAISE EXCEPTION 'Preflight failed: user_profiles table missing.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
        RAISE EXCEPTION 'Preflight failed: leave_requests table missing.';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. CREATE LEAVE POLICY YEARS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_policy_years (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_year integer NOT NULL,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    effective_from date NOT NULL,
    effective_to date NOT NULL,
    created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    published_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_policy_year_status CHECK (status IN ('draft', 'published', 'archived')),
    CONSTRAINT chk_effective_dates CHECK (effective_to >= effective_from),
    CONSTRAINT unique_policy_year UNIQUE (policy_year)
);

-- ----------------------------------------------------------------------------
-- 3. CREATE LEAVE POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_policies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_year_id uuid NOT NULL REFERENCES public.leave_policy_years(id) ON DELETE CASCADE,
    leave_type_key text NOT NULL,
    display_name text NOT NULL,
    description text,
    annual_entitlement numeric(6,2) NOT NULL DEFAULT 0,
    is_paid boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    requires_balance boolean NOT NULL DEFAULT true,
    allow_half_day boolean NOT NULL DEFAULT false,
    allow_negative_balance boolean NOT NULL DEFAULT false,
    max_consecutive_days numeric(6,2),
    min_notice_days integer NOT NULL DEFAULT 0,
    max_carry_forward_days numeric(6,2) NOT NULL DEFAULT 0,
    requires_attachment_after_days numeric(6,2),
    sort_order integer NOT NULL DEFAULT 0,
    created_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unique_policy_year_type UNIQUE (policy_year_id, leave_type_key),
    CONSTRAINT chk_annual_entitlement_nonnegative CHECK (annual_entitlement >= 0),
    CONSTRAINT chk_min_notice_nonnegative CHECK (min_notice_days >= 0),
    CONSTRAINT chk_carry_forward_nonnegative CHECK (max_carry_forward_days >= 0),
    CONSTRAINT chk_max_consecutive_nonnegative CHECK (max_consecutive_days IS NULL OR max_consecutive_days >= 0),
    CONSTRAINT chk_attachment_after_nonnegative CHECK (requires_attachment_after_days IS NULL OR requires_attachment_after_days >= 0)
);

-- ----------------------------------------------------------------------------
-- 4. EXTEND EMPLOYEE LEAVE BALANCES TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.employee_leave_balances 
    ADD COLUMN IF NOT EXISTS policy_id uuid REFERENCES public.leave_policies(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_emp_policy_balance'
    ) THEN
        ALTER TABLE public.employee_leave_balances 
            ADD CONSTRAINT unique_emp_policy_balance UNIQUE (employee_id, policy_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 5. CREATE LEAVE BALANCE ADJUSTMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_balance_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_leave_balance_id uuid NOT NULL REFERENCES public.employee_leave_balances(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    policy_id uuid REFERENCES public.leave_policies(id) ON DELETE SET NULL,
    delta_days numeric(6,2) NOT NULL,
    reason text NOT NULL,
    actor_id uuid NOT NULL REFERENCES public.user_profiles(id),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_delta_days_nonzero CHECK (delta_days <> 0)
);

-- ----------------------------------------------------------------------------
-- 6. EXTEND LEAVE REQUESTS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS policy_id uuid REFERENCES public.leave_policies(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS requester_role_snapshot text;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS hr_reviewed_by uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS hr_reviewed_at timestamptz;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS hr_review_note text;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES public.user_profiles(id);
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS admin_review_note text;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS workflow_version integer NOT NULL DEFAULT 1;

-- Convert status column type from enum to text if needed
DO $$
BEGIN
    ALTER TABLE public.leave_requests ALTER COLUMN status TYPE text USING status::text;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 7. CREATE LEAVE REQUEST ACTIONS TABLE (IMMUTABLE AUDIT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_request_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES public.user_profiles(id),
    actor_role text,
    action text NOT NULL,
    from_status text,
    to_status text NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_request_actions_req_date 
ON public.leave_request_actions (leave_request_id, created_at);

-- ----------------------------------------------------------------------------
-- 8. INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leave_requests_status_created 
ON public.leave_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_created 
ON public.leave_requests (employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_requests_hr_reviewed 
ON public.leave_requests (hr_reviewed_by) WHERE hr_reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leave_requests_admin_reviewed 
ON public.leave_requests (admin_reviewed_by) WHERE admin_reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_leave_balances_emp_year 
ON public.employee_leave_balances (employee_id, policy_year);

CREATE INDEX IF NOT EXISTS idx_leave_policies_year_active 
ON public.leave_policies (policy_year_id, is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_leave_balance_adjustments_emp_created 
ON public.leave_balance_adjustments (employee_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. CANONICAL POLICY SEED & DATA BACKFILL
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_year_2026_id uuid;
    v_rec record;
    v_pol record;
    v_actor_role text;
BEGIN
    -- Seed Policy Year 2026 if missing
    SELECT id INTO v_year_2026_id FROM public.leave_policy_years WHERE policy_year = 2026;
    IF v_year_2026_id IS NULL THEN
        INSERT INTO public.leave_policy_years (policy_year, name, status, effective_from, effective_to, published_at)
        VALUES (2026, '2026 Annual Leave Policy', 'published', '2026-01-01', '2026-12-31', now())
        RETURNING id INTO v_year_2026_id;
    END IF;

    -- Seed 2026 Leave Policies
    INSERT INTO public.leave_policies (policy_year_id, leave_type_key, display_name, description, annual_entitlement, is_paid, is_active, requires_balance, allow_half_day, allow_negative_balance, max_consecutive_days, min_notice_days, max_carry_forward_days, requires_attachment_after_days, sort_order)
    VALUES
        (v_year_2026_id, 'casual', 'Casual Leave', 'Short-term casual time off', 12, true, true, true, true, false, 3, 1, 0, NULL, 10),
        (v_year_2026_id, 'sick', 'Sick Leave', 'Medical or health related time off', 8, true, true, true, true, false, NULL, 0, 0, 2, 20),
        (v_year_2026_id, 'earned', 'Earned Leave', 'Privilege / annual leave entitlement', 21, true, true, true, true, false, NULL, 7, 30, NULL, 30),
        (v_year_2026_id, 'unpaid', 'Unpaid Leave', 'Leave without pay', 0, false, true, false, true, true, NULL, 0, 0, NULL, 40),
        (v_year_2026_id, 'maternity', 'Maternity Leave', 'Maternity benefit leave', 180, true, true, false, false, false, NULL, 15, 0, NULL, 50),
        (v_year_2026_id, 'paternity', 'Paternity Leave', 'Paternity benefit leave', 15, true, true, false, false, false, NULL, 5, 0, NULL, 60)
    ON CONFLICT (policy_year_id, leave_type_key) DO NOTHING;

    -- Backfill requester_role_snapshot on leave_requests
    UPDATE public.leave_requests lr
    SET requester_role_snapshot = up.role::text
    FROM public.user_profiles up
    WHERE lr.employee_id = up.id AND lr.requester_role_snapshot IS NULL;

    -- Map legacy pending statuses
    -- HR managers -> pending_admin_confirmation
    -- Ordinary employees -> pending_hr_review
    UPDATE public.leave_requests
    SET status = 'pending_admin_confirmation'
    WHERE status = 'pending' AND requester_role_snapshot = 'hr_manager';

    UPDATE public.leave_requests
    SET status = 'pending_hr_review'
    WHERE status = 'pending';

    -- Map legacy rejected status if any
    UPDATE public.leave_requests lr
    SET status = CASE 
        WHEN rev.role::text = 'hr_manager' THEN 'rejected_by_hr'
        ELSE 'rejected_by_admin'
    END
    FROM public.user_profiles rev
    WHERE lr.status = 'rejected' AND lr.reviewed_by = rev.id;

    UPDATE public.leave_requests
    SET status = 'rejected_by_admin'
    WHERE status = 'rejected';

    -- Backfill reviewer columns
    UPDATE public.leave_requests lr
    SET 
        hr_reviewed_by = lr.reviewed_by,
        hr_reviewed_at = lr.reviewed_at,
        hr_review_note = lr.review_note
    FROM public.user_profiles rev
    WHERE lr.reviewed_by IS NOT NULL 
      AND lr.reviewed_by = rev.id 
      AND rev.role::text = 'hr_manager'
      AND lr.hr_reviewed_by IS NULL;

    UPDATE public.leave_requests lr
    SET 
        admin_reviewed_by = lr.reviewed_by,
        admin_reviewed_at = lr.reviewed_at,
        admin_review_note = lr.review_note
    FROM public.user_profiles rev
    WHERE lr.reviewed_by IS NOT NULL 
      AND lr.reviewed_by = rev.id 
      AND rev.role::text IN ('admin', 'super_admin')
      AND lr.admin_reviewed_by IS NULL;

    -- Link policy_id on employee_leave_balances
    UPDATE public.employee_leave_balances elb
    SET policy_id = lp.id
    FROM public.leave_policy_years lpy, public.leave_policies lp
    WHERE elb.policy_year = lpy.policy_year
      AND lp.policy_year_id = lpy.id
      AND elb.leave_type = lp.leave_type_key
      AND elb.policy_id IS NULL;

    -- Link policy_id on leave_requests
    UPDATE public.leave_requests lr
    SET policy_id = lp.id
    FROM public.leave_policy_years lpy, public.leave_policies lp
    WHERE lr.policy_year = lpy.policy_year
      AND lp.policy_year_id = lpy.id
      AND lr.leave_type = lp.leave_type_key
      AND lr.policy_id IS NULL;

    -- Seed missing leave_request_actions for all requests
    FOR v_rec IN SELECT * FROM public.leave_requests LOOP
        IF NOT EXISTS (SELECT 1 FROM public.leave_request_actions WHERE leave_request_id = v_rec.id) THEN
            -- Insert submitted action
            INSERT INTO public.leave_request_actions (leave_request_id, actor_id, actor_role, action, from_status, to_status, note, created_at)
            VALUES (v_rec.id, v_rec.employee_id, v_rec.requester_role_snapshot, 'submitted', NULL, 
                    CASE WHEN v_rec.requester_role_snapshot = 'hr_manager' THEN 'pending_admin_confirmation' ELSE 'pending_hr_review' END,
                    v_rec.reason, v_rec.created_at);

            -- Insert final action if processed
            IF v_rec.status NOT IN ('pending_hr_review', 'pending_admin_confirmation') THEN
                INSERT INTO public.leave_request_actions (leave_request_id, actor_id, actor_role, action, from_status, to_status, note, created_at)
                VALUES (v_rec.id, COALESCE(v_rec.admin_reviewed_by, v_rec.hr_reviewed_by, v_rec.cancelled_by, v_rec.reviewed_by, v_rec.employee_id),
                        'reviewer', v_rec.status, 
                        CASE WHEN v_rec.requester_role_snapshot = 'hr_manager' THEN 'pending_admin_confirmation' ELSE 'pending_hr_review' END,
                        v_rec.status, COALESCE(v_rec.admin_review_note, v_rec.hr_review_note, v_rec.cancel_reason, v_rec.review_note),
                        COALESCE(v_rec.admin_reviewed_at, v_rec.hr_reviewed_at, v_rec.cancelled_at, v_rec.reviewed_at, v_rec.created_at));
            END IF;
        END IF;
    END LOOP;

    -- Reconcile reserved_days and used_days on employee_leave_balances
    UPDATE public.employee_leave_balances elb
    SET 
        reserved_days = COALESCE((
            SELECT SUM(COALESCE(chargeable_days, 1))
            FROM public.leave_requests lr
            WHERE lr.employee_id = elb.employee_id
              AND lr.policy_year = elb.policy_year
              AND lr.leave_type = elb.leave_type
              AND lr.status IN ('pending_hr_review', 'pending_admin_confirmation')
        ), 0),
        used_days = COALESCE((
            SELECT SUM(COALESCE(chargeable_days, 1))
            FROM public.leave_requests lr
            WHERE lr.employee_id = elb.employee_id
              AND lr.policy_year = elb.policy_year
              AND lr.leave_type = elb.leave_type
              AND lr.status = 'approved'
        ), 0),
        updated_at = now();

END $$;

-- Add status check constraint AFTER backfill is complete
ALTER TABLE public.leave_requests DROP CONSTRAINT IF EXISTS chk_leave_requests_status;
ALTER TABLE public.leave_requests ADD CONSTRAINT chk_leave_requests_status 
CHECK (status IN (
    'pending_hr_review',
    'pending_admin_confirmation',
    'approved',
    'rejected_by_hr',
    'rejected_by_admin',
    'cancelled'
));

-- ----------------------------------------------------------------------------
-- 10. ATOMIC RPC FUNCTIONS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- A. submit_leave_request
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
    IF v_policy_rec.min_notice_days > 0 AND v_notice_days < v_policy_rec.min_notice_days THEN
        RAISE EXCEPTION 'Leave request requires at least % day(s) advance notice.', v_policy_rec.min_notice_days;
    END IF;

    v_breakdown := public.calculate_leave_days_breakdown(p_from_date, p_to_date, v_actor_id);
    v_chargeable := (v_breakdown->>'chargeable_days')::numeric;

    IF v_chargeable <= 0 AND v_policy_rec.requires_balance THEN
        RAISE EXCEPTION 'Selected date range contains 0 chargeable work days.';
    END IF;

    v_consec_days := (v_breakdown->>'calendar_days')::numeric;
    IF v_policy_rec.max_consecutive_days IS NOT NULL AND v_consec_days > v_policy_rec.max_consecutive_days THEN
        RAISE EXCEPTION 'Leave duration exceeds maximum consecutive limit of % days.', v_policy_rec.max_consecutive_days;
    END IF;

    SELECT COUNT(*) INTO v_overlap
    FROM public.leave_requests
    WHERE employee_id = v_actor_id
      AND status IN ('pending_hr_review', 'pending_admin_confirmation', 'approved')
      AND (from_date <= p_to_date AND to_date >= p_from_date);

    IF v_overlap > 0 THEN
        RAISE EXCEPTION 'Leave request overlaps with an existing pending or approved leave request.';
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

        v_available := (v_balance.entitled_days + v_balance.carried_forward_days + v_balance.accrued_days + v_balance.adjustment_days) - (v_balance.used_days + v_balance.reserved_days);

        IF NOT v_policy_rec.allow_negative_balance AND v_available < v_chargeable THEN
            RAISE EXCEPTION 'Insufficient leave balance. Available: %, Requested: %', v_available, v_chargeable;
        END IF;

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

-- B. hr_review_leave_request
CREATE OR REPLACE FUNCTION public.hr_review_leave_request(
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
    v_to_status text;
    v_updated record;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();
    ELSE
        v_actor_id := p_actor_id;
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call.';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_actor_role <> 'hr_manager' THEN
        RAISE EXCEPTION 'Forbidden: Only HR Managers can perform HR review.';
    END IF;

    IF p_action NOT IN ('recommend', 'reject') THEN
        RAISE EXCEPTION 'Invalid HR review action: %. Must be "recommend" or "reject".', p_action;
    END IF;

    SELECT * INTO v_request FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
    IF v_request.id IS NULL THEN
        RAISE EXCEPTION 'Leave request not found.';
    END IF;

    IF v_request.employee_id = v_actor_id THEN
        RAISE EXCEPTION 'Forbidden: HR Managers cannot review their own leave requests.';
    END IF;

    IF v_request.requester_role_snapshot = 'hr_manager' THEN
        RAISE EXCEPTION 'Forbidden: HR Managers cannot review leave requests of other HR managers.';
    END IF;

    IF v_request.status <> 'pending_hr_review' THEN
        RAISE EXCEPTION 'Conflict: Leave request is not pending HR review (current status: %).', v_request.status;
    END IF;

    IF p_action = 'reject' AND (p_note IS NULL OR TRIM(p_note) = '') THEN
        RAISE EXCEPTION 'Rejection note is mandatory.';
    END IF;

    v_chargeable := COALESCE(v_request.chargeable_days, 1);

    IF p_action = 'recommend' THEN
        v_to_status := 'pending_admin_confirmation';
    ELSE
        v_to_status := 'rejected_by_hr';
        SELECT * INTO v_balance 
        FROM public.employee_leave_balances 
        WHERE employee_id = v_request.employee_id 
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
        status = v_to_status,
        hr_reviewed_by = v_actor_id,
        hr_reviewed_at = now(),
        hr_review_note = p_note,
        reviewed_by = v_actor_id,
        reviewed_at = now(),
        review_note = p_note,
        workflow_version = workflow_version + 1,
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO public.leave_request_actions (
        leave_request_id, actor_id, actor_role, action, from_status, to_status, note
    ) VALUES (
        p_request_id, v_actor_id, v_actor_role, p_action, 'pending_hr_review', v_to_status, p_note
    );

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'HR review executed', 'leave_requests', p_request_id,
        jsonb_build_object('status', 'pending_hr_review'),
        jsonb_build_object('status', v_to_status, 'hr_review_note', p_note, 'hr_action', p_action),
        'Leaves', 'medium'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_updated));
END;
$$;

-- C. admin_review_leave_request
CREATE OR REPLACE FUNCTION public.admin_review_leave_request(
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
    v_to_status text;
    v_updated record;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();
    ELSE
        v_actor_id := p_actor_id;
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call.';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_actor_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Forbidden: Only Admins can perform admin review.';
    END IF;

    IF p_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid Admin review action: %. Must be "approve" or "reject".', p_action;
    END IF;

    SELECT * INTO v_request FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
    IF v_request.id IS NULL THEN
        RAISE EXCEPTION 'Leave request not found.';
    END IF;

    IF v_request.status <> 'pending_admin_confirmation' THEN
        RAISE EXCEPTION 'Conflict: Leave request is not pending admin confirmation (current status: %).', v_request.status;
    END IF;

    IF p_action = 'reject' AND (p_note IS NULL OR TRIM(p_note) = '') THEN
        RAISE EXCEPTION 'Rejection note is mandatory.';
    END IF;

    v_chargeable := COALESCE(v_request.chargeable_days, 1);

    SELECT * INTO v_balance 
    FROM public.employee_leave_balances 
    WHERE employee_id = v_request.employee_id 
      AND policy_year = COALESCE(v_request.policy_year, EXTRACT(YEAR FROM v_request.from_date)::int)
      AND leave_type = v_request.leave_type
    FOR UPDATE;

    IF p_action = 'approve' THEN
        v_to_status := 'approved';
        IF v_balance.id IS NOT NULL THEN
            UPDATE public.employee_leave_balances
            SET 
                reserved_days = GREATEST(0, reserved_days - v_chargeable),
                used_days = used_days + v_chargeable,
                version = version + 1,
                updated_at = now()
            WHERE id = v_balance.id;
        END IF;
    ELSE
        v_to_status := 'rejected_by_admin';
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
        status = v_to_status,
        admin_reviewed_by = v_actor_id,
        admin_reviewed_at = now(),
        admin_review_note = p_note,
        reviewed_by = v_actor_id,
        reviewed_at = now(),
        review_note = p_note,
        workflow_version = workflow_version + 1,
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO public.leave_request_actions (
        leave_request_id, actor_id, actor_role, action, from_status, to_status, note
    ) VALUES (
        p_request_id, v_actor_id, v_actor_role, p_action, 'pending_admin_confirmation', v_to_status, p_note
    );

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'Admin review executed', 'leave_requests', p_request_id,
        jsonb_build_object('status', 'pending_admin_confirmation'),
        jsonb_build_object('status', v_to_status, 'admin_review_note', p_note, 'admin_action', p_action),
        'Leaves', 'medium'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_updated));
END;
$$;

-- D. cancel_leave_request
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
    v_actor_role text;
    v_request record;
    v_balance record;
    v_chargeable numeric(5,2);
    v_updated record;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();
    ELSE
        v_actor_id := p_actor_id;
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call.';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;

    SELECT * INTO v_request FROM public.leave_requests WHERE id = p_request_id FOR UPDATE;
    IF v_request.id IS NULL THEN
        RAISE EXCEPTION 'Leave request not found.';
    END IF;

    IF v_request.employee_id <> v_actor_id THEN
        RAISE EXCEPTION 'Forbidden: You can only cancel your own leave requests.';
    END IF;

    IF v_request.status NOT IN ('pending_hr_review', 'pending_admin_confirmation') THEN
        RAISE EXCEPTION 'Cannot cancel leave request with status "%".', v_request.status;
    END IF;

    v_chargeable := COALESCE(v_request.chargeable_days, 1);

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

    UPDATE public.leave_requests
    SET 
        status = 'cancelled',
        cancelled_by = v_actor_id,
        cancelled_at = now(),
        cancel_reason = p_reason,
        workflow_version = workflow_version + 1,
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_updated;

    INSERT INTO public.leave_request_actions (
        leave_request_id, actor_id, actor_role, action, from_status, to_status, note
    ) VALUES (
        p_request_id, v_actor_id, v_actor_role, 'cancel', v_request.status, 'cancelled', p_reason
    );

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'Leave request cancelled', 'leave_requests', p_request_id,
        jsonb_build_object('status', v_request.status),
        jsonb_build_object('status', 'cancelled', 'cancel_reason', p_reason),
        'Leaves', 'low'
    );

    RETURN jsonb_build_object('success', true, 'request', row_to_json(v_updated));
END;
$$;

-- E. publish_leave_policy_year
CREATE OR REPLACE FUNCTION public.publish_leave_policy_year(
    p_policy_year_id uuid,
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
    v_year_rec record;
    v_policy_count int;
    v_emp record;
    v_pol record;
    v_created_count int := 0;
    v_existing_count int := 0;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();
    ELSE
        v_actor_id := p_actor_id;
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call.';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_actor_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Forbidden: Only Admins can publish policy years.';
    END IF;

    SELECT * INTO v_year_rec FROM public.leave_policy_years WHERE id = p_policy_year_id FOR UPDATE;
    IF v_year_rec.id IS NULL THEN
        RAISE EXCEPTION 'Policy year not found.';
    END IF;

    SELECT COUNT(*) INTO v_policy_count FROM public.leave_policies WHERE policy_year_id = p_policy_year_id AND is_active = true;
    IF v_policy_count = 0 THEN
        RAISE EXCEPTION 'Cannot publish policy year: At least one active leave policy row is required.';
    END IF;

    UPDATE public.leave_policy_years
    SET 
        status = 'published',
        published_by = v_actor_id,
        published_at = now(),
        updated_at = now()
    WHERE id = p_policy_year_id;

    FOR v_emp IN 
        SELECT id FROM public.user_profiles 
        WHERE role IN (
            'employee', 'hr_manager', 'relationship_exec', 'relationship_manager',
            'freelancer', 'video_editor', 'social_media_manager',
            'seo_specialist', 'advertiser', 'support_agent'
        )
    LOOP
        FOR v_pol IN 
            SELECT * FROM public.leave_policies WHERE policy_year_id = p_policy_year_id AND is_active = true
        LOOP
            IF EXISTS (
                SELECT 1 FROM public.employee_leave_balances 
                WHERE employee_id = v_emp.id AND policy_year = v_year_rec.policy_year AND leave_type = v_pol.leave_type_key
            ) THEN
                v_existing_count := v_existing_count + 1;
                UPDATE public.employee_leave_balances
                SET policy_id = v_pol.id,
                    entitled_days = v_pol.annual_entitlement,
                    updated_at = now()
                WHERE employee_id = v_emp.id AND policy_year = v_year_rec.policy_year AND leave_type = v_pol.leave_type_key;
            ELSE
                INSERT INTO public.employee_leave_balances (
                    employee_id, policy_year, leave_type, policy_id, entitled_days
                ) VALUES (
                    v_emp.id, v_year_rec.policy_year, v_pol.leave_type_key, v_pol.id, v_pol.annual_entitlement
                );
                v_created_count := v_created_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, new_data, module, severity)
    VALUES (
        v_actor_id, 'Policy year published', 'leave_policy_years', p_policy_year_id,
        jsonb_build_object('policy_year', v_year_rec.policy_year, 'created_balances', v_created_count, 'existing_balances', v_existing_count),
        'Leaves', 'high'
    );

    RETURN jsonb_build_object(
        'success', true,
        'policy_year', v_year_rec.policy_year,
        'created_balances', v_created_count,
        'existing_balances', v_existing_count
    );
END;
$$;

-- F. adjust_employee_leave_balance
CREATE OR REPLACE FUNCTION public.adjust_employee_leave_balance(
    p_balance_id uuid,
    p_delta_days numeric,
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
    v_balance record;
    v_policy record;
    v_new_adj numeric(6,2);
    v_available numeric(6,2);
    v_adj_rec record;
    v_updated record;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        v_actor_id := auth.uid();
    ELSE
        v_actor_id := p_actor_id;
    END IF;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized call.';
    END IF;

    SELECT role::text INTO v_actor_role FROM public.user_profiles WHERE id = v_actor_id;
    IF v_actor_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Forbidden: Only Admins can manually adjust leave balances.';
    END IF;

    IF p_delta_days IS NULL OR p_delta_days = 0 THEN
        RAISE EXCEPTION 'Delta days must be a non-zero number.';
    END IF;

    IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
        RAISE EXCEPTION 'Adjustment reason is required for audit trail.';
    END IF;

    SELECT * INTO v_balance FROM public.employee_leave_balances WHERE id = p_balance_id FOR UPDATE;
    IF v_balance.id IS NULL THEN
        RAISE EXCEPTION 'Leave balance record not found.';
    END IF;

    IF v_balance.policy_id IS NOT NULL THEN
        SELECT * INTO v_policy FROM public.leave_policies WHERE id = v_balance.policy_id;
    END IF;

    v_new_adj := v_balance.adjustment_days + p_delta_days;
    v_available := (v_balance.entitled_days + v_balance.carried_forward_days + v_balance.accrued_days + v_new_adj) - (v_balance.used_days + v_balance.reserved_days);

    IF v_policy.id IS NOT NULL AND NOT v_policy.allow_negative_balance AND v_available < 0 THEN
        RAISE EXCEPTION 'Adjustment rejected: Available balance cannot become negative (calculated: %).', v_available;
    END IF;

    UPDATE public.employee_leave_balances
    SET 
        adjustment_days = v_new_adj,
        version = version + 1,
        updated_at = now()
    WHERE id = p_balance_id
    RETURNING * INTO v_updated;

    INSERT INTO public.leave_balance_adjustments (
        employee_leave_balance_id, employee_id, policy_id, delta_days, reason, actor_id
    ) VALUES (
        p_balance_id, v_balance.employee_id, v_balance.policy_id, p_delta_days, p_reason, v_actor_id
    ) RETURNING * INTO v_adj_rec;

    INSERT INTO public.audit_logs_hrm (actor_id, action, table_name, record_id, old_data, new_data, module, severity)
    VALUES (
        v_actor_id, 'Leave balance adjusted', 'employee_leave_balances', p_balance_id,
        jsonb_build_object('old_adjustment_days', v_balance.adjustment_days),
        jsonb_build_object('delta_days', p_delta_days, 'new_adjustment_days', v_new_adj, 'reason', p_reason),
        'Leaves', 'medium'
    );

    RETURN jsonb_build_object('success', true, 'balance', row_to_json(v_updated), 'adjustment', row_to_json(v_adj_rec));
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.hr_review_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_leave_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_leave_policy_year TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_employee_leave_balance TO authenticated;

-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE public.leave_policy_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_request_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for idempotent re-execution
DROP POLICY IF EXISTS "employee_insert_leave" ON public.leave_requests;
DROP POLICY IF EXISTS "employee_view_own_leaves" ON public.leave_requests;
DROP POLICY IF EXISTS "hr_all_leaves" ON public.leave_requests;
DROP POLICY IF EXISTS "workforce_view_published_policy_years" ON public.leave_policy_years;
DROP POLICY IF EXISTS "workforce_view_active_leave_policies" ON public.leave_policies;
DROP POLICY IF EXISTS "emp_view_own_leave_balances" ON public.employee_leave_balances;
DROP POLICY IF EXISTS "emp_view_own_or_authorized_leave_requests" ON public.leave_requests;
DROP POLICY IF EXISTS "view_authorized_leave_request_actions" ON public.leave_request_actions;
DROP POLICY IF EXISTS "view_authorized_leave_balance_adjustments" ON public.leave_balance_adjustments;

-- leave_policy_years / leave_policies RLS
CREATE POLICY "workforce_view_published_policy_years" ON public.leave_policy_years
    FOR SELECT USING (
        status = 'published' OR 
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
    );

CREATE POLICY "workforce_view_active_leave_policies" ON public.leave_policies
    FOR SELECT USING (
        is_active = true OR 
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
    );

-- employee_leave_balances RLS
CREATE POLICY "emp_view_own_leave_balances" ON public.employee_leave_balances
    FOR SELECT USING (
        employee_id = auth.uid() OR
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
    );

-- leave_requests RLS
CREATE POLICY "emp_view_own_or_authorized_leave_requests" ON public.leave_requests
    FOR SELECT USING (
        employee_id = auth.uid() OR
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
    );

-- leave_request_actions RLS
CREATE POLICY "view_authorized_leave_request_actions" ON public.leave_request_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.leave_requests lr 
            WHERE lr.id = leave_request_id 
              AND (
                  lr.employee_id = auth.uid() OR 
                  (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
              )
        )
    );

-- leave_balance_adjustments RLS
CREATE POLICY "view_authorized_leave_balance_adjustments" ON public.leave_balance_adjustments
    FOR SELECT USING (
        employee_id = auth.uid() OR
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
    );
