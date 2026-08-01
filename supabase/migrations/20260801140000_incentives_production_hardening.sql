-- Forward-Only Supabase Migration for Incentives & Bonuses Module Production Hardening
-- Migration Timestamp: 20260801140000

BEGIN;

-- 1. PREFLIGHT & ACCESS CONTROL HARDENING
-- Revoke excessive privileges from PUBLIC and anon on historical incentives objects
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incentives') THEN
        REVOKE ALL ON TABLE public.incentives FROM PUBLIC;
        REVOKE ALL ON TABLE public.incentives FROM anon;
    END IF;
END $$;

-- 2. CREATE INCENTIVE BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.incentive_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_mode TEXT NOT NULL CHECK (recipient_mode IN ('individual', 'team')),
    team_id UUID NULL REFERENCES public.teams(id) ON DELETE SET NULL,
    team_name_snapshot TEXT NULL,
    allocation_mode TEXT NOT NULL CHECK (allocation_mode IN ('per_person', 'total_pool')),
    incentive_type TEXT NOT NULL CHECK (incentive_type IN (
        'performance_bonus', 'referral_bonus', 'festival_bonus', 'spot_award', 'retention_bonus', 'other'
    )),
    description TEXT NULL,
    internal_note TEXT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payroll_month INTEGER NULL CHECK (payroll_month BETWEEN 1 AND 12),
    payroll_year INTEGER NULL CHECK (payroll_year BETWEEN 2000 AND 2100),
    total_amount_paise BIGINT NOT NULL CHECK (total_amount_paise > 0),
    per_person_amount_paise BIGINT NULL CHECK (per_person_amount_paise IS NULL OR per_person_amount_paise > 0),
    eligible_member_count INTEGER NOT NULL DEFAULT 1 CHECK (eligible_member_count > 0),
    excluded_member_count INTEGER NOT NULL DEFAULT 0 CHECK (excluded_member_count >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'cancelled', 'paid', 'reversed'
    )),
    created_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ NULL,
    rejected_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    rejected_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    paid_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ NULL,
    cancelled_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ NULL,
    cancellation_reason TEXT NULL,
    reversed_by UUID NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reversed_at TIMESTAMPTZ NULL,
    reversal_reason TEXT NULL,
    idempotency_key TEXT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique idempotency constraint per creator
CREATE UNIQUE INDEX IF NOT EXISTS idx_incentive_batches_creator_idempotency
ON public.incentive_batches(created_by, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 3. CREATE INCENTIVE ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.incentive_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.incentive_batches(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    employee_name_snapshot TEXT NOT NULL,
    employee_code_snapshot TEXT NULL,
    team_id_snapshot UUID NULL,
    team_name_snapshot TEXT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'cancelled', 'paid', 'reversed'
    )),
    salary_record_id UUID NULL REFERENCES public.salary_records(id) ON DELETE SET NULL,
    payroll_line_item_id UUID NULL,
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_incentive_allocation_batch_employee UNIQUE (batch_id, employee_id)
);

-- 4. CREATE PAYROLL LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.payroll_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    salary_record_id UUID NOT NULL REFERENCES public.salary_records(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE RESTRICT,
    source_type TEXT NOT NULL CHECK (source_type IN ('incentive', 'allowance', 'deduction', 'adjustment')),
    source_id UUID NULL,
    label TEXT NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    taxable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_payroll_line_items_source UNIQUE (salary_record_id, source_type, source_id)
);

-- Add Foreign Key from allocations to payroll_line_items if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_allocations_payroll_line_item'
    ) THEN
        ALTER TABLE public.incentive_allocations
        ADD CONSTRAINT fk_allocations_payroll_line_item
        FOREIGN KEY (payroll_line_item_id) REFERENCES public.payroll_line_items(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. BACKFILL LEGACY DATA FROM public.incentives
DO $$
DECLARE
    rec RECORD;
    v_batch_id UUID;
    v_type TEXT;
    v_status TEXT;
    v_amount_paise BIGINT;
    v_emp_name TEXT;
    v_emp_code TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incentives') THEN
        FOR rec IN SELECT * FROM public.incentives LOOP
            -- Map legacy type
            CASE rec.type::text
                WHEN 'Performance Bonus' THEN v_type := 'performance_bonus';
                WHEN 'Referral' THEN v_type := 'referral_bonus';
                WHEN 'Festival Bonus' THEN v_type := 'festival_bonus';
                ELSE v_type := 'other';
            END CASE;

            -- Map legacy status
            CASE rec.status::text
                WHEN 'Approved' THEN v_status := 'approved';
                WHEN 'Paid' THEN v_status := 'paid';
                ELSE v_status := 'pending';
            END CASE;

            v_amount_paise := ROUND(rec.amount * 100);

            -- Fetch display snapshots
            SELECT full_name, employee_id INTO v_emp_name, v_emp_code
            FROM public.user_profiles
            WHERE id = rec.employee_id;

            IF v_emp_name IS NULL THEN
                v_emp_name := 'Legacy Recipient';
            END IF;

            -- Insert backfilled batch if allocation not already created
            IF NOT EXISTS (
                SELECT 1 FROM public.incentive_allocations WHERE id = rec.id
            ) THEN
                INSERT INTO public.incentive_batches (
                    id, recipient_mode, allocation_mode, incentive_type,
                    description, effective_date, total_amount_paise, per_person_amount_paise,
                    eligible_member_count, excluded_member_count, status, created_at, updated_at
                ) VALUES (
                    rec.id, 'individual', 'per_person', v_type,
                    rec.description, COALESCE(rec.date_awarded::date, CURRENT_DATE), v_amount_paise, v_amount_paise,
                    1, 0, v_status, COALESCE(rec.created_at, now()), COALESCE(rec.updated_at, now())
                )
                ON CONFLICT (id) DO NOTHING;

                INSERT INTO public.incentive_allocations (
                    id, batch_id, employee_id, employee_name_snapshot, employee_code_snapshot,
                    amount_paise, status, created_at, updated_at
                ) VALUES (
                    rec.id, rec.id, rec.employee_id, v_emp_name, v_emp_code,
                    v_amount_paise, v_status, COALESCE(rec.created_at, now()), COALESCE(rec.updated_at, now())
                )
                ON CONFLICT (id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
END $$;

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_incentive_allocations_employee_date ON public.incentive_allocations(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incentive_allocations_batch ON public.incentive_allocations(batch_id);
CREATE INDEX IF NOT EXISTS idx_incentive_allocations_salary ON public.incentive_allocations(salary_record_id);

CREATE INDEX IF NOT EXISTS idx_incentive_batches_status_date ON public.incentive_batches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incentive_batches_team_date ON public.incentive_batches(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incentive_batches_period ON public.incentive_batches(payroll_year, payroll_month, status);

CREATE INDEX IF NOT EXISTS idx_payroll_line_items_salary ON public.payroll_line_items(salary_record_id);
CREATE INDEX IF NOT EXISTS idx_payroll_line_items_employee ON public.payroll_line_items(employee_id);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.incentive_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_line_items ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies if any
DROP POLICY IF EXISTS "hr_read_batches" ON public.incentive_batches;
DROP POLICY IF EXISTS "hr_write_batches" ON public.incentive_batches;
DROP POLICY IF EXISTS "emp_read_batches" ON public.incentive_batches;
DROP POLICY IF EXISTS "hr_read_allocations" ON public.incentive_allocations;
DROP POLICY IF EXISTS "emp_read_own_allocations" ON public.incentive_allocations;
DROP POLICY IF EXISTS "hr_read_payroll_items" ON public.payroll_line_items;
DROP POLICY IF EXISTS "emp_read_own_payroll_items" ON public.payroll_line_items;

-- RLS POLICIES FOR INCENTIVE BATCHES
CREATE POLICY "hr_read_batches" ON public.incentive_batches
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role IN ('hr_manager', 'admin', 'super_admin')
    )
);

CREATE POLICY "emp_read_batches" ON public.incentive_batches
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.incentive_allocations ia
        WHERE ia.batch_id = public.incentive_batches.id AND ia.employee_id = auth.uid()
    )
);

-- RLS POLICIES FOR INCENTIVE ALLOCATIONS
CREATE POLICY "hr_read_allocations" ON public.incentive_allocations
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role IN ('hr_manager', 'admin', 'super_admin')
    )
);

CREATE POLICY "emp_read_own_allocations" ON public.incentive_allocations
FOR SELECT TO authenticated
USING (
    employee_id = auth.uid()
);

-- RLS POLICIES FOR PAYROLL LINE ITEMS
CREATE POLICY "hr_read_payroll_items" ON public.payroll_line_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() AND up.role IN ('hr_manager', 'admin', 'super_admin')
    )
);

CREATE POLICY "emp_read_own_payroll_items" ON public.payroll_line_items
FOR SELECT TO authenticated
USING (
    employee_id = auth.uid()
);

-- REVOKE DIRECT MUTATIONS FROM PUBLIC AND anon; WRITES HAPPEN VIA RPC OR SERVER ROLE
REVOKE ALL ON TABLE public.incentive_batches FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.incentive_allocations FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.payroll_line_items FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.incentive_batches TO authenticated;
GRANT SELECT ON TABLE public.incentive_allocations TO authenticated;
GRANT SELECT ON TABLE public.payroll_line_items TO authenticated;
GRANT ALL ON TABLE public.incentive_batches TO service_role;
GRANT ALL ON TABLE public.incentive_allocations TO service_role;
GRANT ALL ON TABLE public.payroll_line_items TO service_role;

-- 8. STORED PROCEDURES & TRANSACTION RPCS

-- RPC: award_individual_incentive
CREATE OR REPLACE FUNCTION public.award_individual_incentive(
    p_employee_id UUID,
    p_incentive_type TEXT,
    p_amount_paise BIGINT,
    p_description TEXT DEFAULT NULL,
    p_internal_note TEXT DEFAULT NULL,
    p_effective_date DATE DEFAULT CURRENT_DATE,
    p_payroll_month INT DEFAULT NULL,
    p_payroll_year INT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_actor_name TEXT;
    v_emp_name TEXT;
    v_emp_code TEXT;
    v_emp_role TEXT;
    v_emp_suspended BOOLEAN;
    v_existing_batch_id UUID;
    v_batch_id UUID;
    v_allocation_id UUID;
BEGIN
    -- Derive caller
    v_actor_id := COALESCE(p_caller_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'error', 'Authentication required');
    END IF;

    SELECT role::text, full_name INTO v_actor_role, v_actor_name
    FROM public.user_profiles
    WHERE id = v_actor_id;

    IF v_actor_role NOT IN ('hr_manager', 'admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'HR permissions required');
    END IF;

    -- Idempotency check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_batch_id
        FROM public.incentive_batches
        WHERE created_by = v_actor_id AND idempotency_key = p_idempotency_key;

        IF v_existing_batch_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'code', 'DUPLICATE_IDEMPOTENT', 'batch_id', v_existing_batch_id);
        END IF;
    END IF;

    -- Validate employee
    SELECT full_name, employee_id, role::text, is_suspended INTO v_emp_name, v_emp_code, v_emp_role, v_emp_suspended
    FROM public.user_profiles
    WHERE id = p_employee_id;

    IF v_emp_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'EMPLOYEE_NOT_FOUND', 'error', 'Target employee does not exist');
    END IF;

    IF v_emp_suspended THEN
        RETURN jsonb_build_object('success', false, 'code', 'EMPLOYEE_INACTIVE', 'error', 'Cannot award incentive to suspended employee');
    END IF;

    -- Validate amount
    IF p_amount_paise <= 0 OR p_amount_paise > 1000000000 THEN -- Max 1 Crore INR (10,000,000 RS)
        RETURN jsonb_build_object('success', false, 'code', 'AMOUNT_OUT_OF_RANGE', 'error', 'Amount out of allowed policy range');
    END IF;

    -- Validate type
    IF p_incentive_type NOT IN ('performance_bonus', 'referral_bonus', 'festival_bonus', 'spot_award', 'retention_bonus', 'other') THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_TYPE', 'error', 'Unknown incentive type');
    END IF;

    -- Create Batch & Allocation
    INSERT INTO public.incentive_batches (
        recipient_mode, allocation_mode, incentive_type, description, internal_note,
        effective_date, payroll_month, payroll_year, total_amount_paise, per_person_amount_paise,
        eligible_member_count, excluded_member_count, status, created_by, idempotency_key
    ) VALUES (
        'individual', 'per_person', p_incentive_type, p_description, p_internal_note,
        COALESCE(p_effective_date, CURRENT_DATE), p_payroll_month, p_payroll_year, p_amount_paise, p_amount_paise,
        1, 0, 'pending', v_actor_id, p_idempotency_key
    )
    RETURNING id INTO v_batch_id;

    INSERT INTO public.incentive_allocations (
        batch_id, employee_id, employee_name_snapshot, employee_code_snapshot,
        amount_paise, status
    ) VALUES (
        v_batch_id, p_employee_id, v_emp_name, v_emp_code,
        p_amount_paise, 'pending'
    )
    RETURNING id INTO v_allocation_id;

    -- Write Audit Log
    INSERT INTO public.audit_logs_hrm (
        actor_id, actor_name, action, table_name, record_id,
        new_data, module, severity
    ) VALUES (
        v_actor_id, COALESCE(v_actor_name, 'HR Manager'), 'CREATE_INDIVIDUAL_INCENTIVE', 'incentive_batches', v_batch_id,
        jsonb_build_object('batch_id', v_batch_id, 'employee_id', p_employee_id, 'amount_paise', p_amount_paise, 'type', p_incentive_type),
        'Incentives', 'medium'
    );

    -- Create Notification for Employee
    INSERT INTO public.notifications (
        user_id, title, body, type, reference_id, reference_type
    ) VALUES (
        p_employee_id, 'New Incentive Awarded',
        format('You have been awarded a new incentive of ₹%s (%s).', (p_amount_paise::numeric / 100.0)::text, p_incentive_type),
        'info', v_batch_id, 'incentive_batch'
    );

    RETURN jsonb_build_object('success', true, 'batch_id', v_batch_id, 'allocation_id', v_allocation_id);
END;
$$;


-- RPC: preview_team_incentive
CREATE OR REPLACE FUNCTION public.preview_team_incentive(
    p_team_id UUID,
    p_allocation_mode TEXT,
    p_input_amount_paise BIGINT,
    p_include_lead BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_team_name TEXT;
    v_team_lead_id UUID;
    v_team_active BOOLEAN;
    v_eligible_count INT := 0;
    v_excluded_count INT := 0;
    v_member_record RECORD;
    v_eligible_list JSONB := '[]'::jsonb;
    v_excluded_list JSONB := '[]'::jsonb;
    v_per_person_paise BIGINT := 0;
    v_total_cost_paise BIGINT := 0;
    v_remainder_paise BIGINT := 0;
BEGIN
    SELECT name, team_lead_id, is_active INTO v_team_name, v_team_lead_id, v_team_active
    FROM public.teams
    WHERE id = p_team_id;

    IF v_team_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_NOT_FOUND', 'error', 'Target team does not exist');
    END IF;

    IF NOT v_team_active THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_INACTIVE', 'error', 'Target team is inactive');
    END IF;

    -- Loop over members joining team_members and user_profiles
    FOR v_member_record IN (
        SELECT up.id, up.full_name, up.employee_id AS emp_code, up.role::text, up.is_suspended
        FROM public.team_members tm
        JOIN public.user_profiles up ON up.id = tm.user_id
        WHERE tm.team_id = p_team_id
        ORDER BY up.id ASC
    ) LOOP
        IF v_member_record.is_suspended THEN
            v_excluded_count := v_excluded_count + 1;
            v_excluded_list := v_excluded_list || jsonb_build_object('id', v_member_record.id, 'name', v_member_record.full_name, 'reason', 'Suspended');
        ELSIF NOT p_include_lead AND v_member_record.id = v_team_lead_id THEN
            v_excluded_count := v_excluded_count + 1;
            v_excluded_list := v_excluded_list || jsonb_build_object('id', v_member_record.id, 'name', v_member_record.full_name, 'reason', 'Excluded Team Lead');
        ELSE
            v_eligible_count := v_eligible_count + 1;
            v_eligible_list := v_eligible_list || jsonb_build_object('id', v_member_record.id, 'name', v_member_record.full_name, 'code', v_member_record.emp_code);
        END IF;
    END LOOP;

    IF v_eligible_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NO_ELIGIBLE_MEMBERS', 'error', 'Team has no active eligible members');
    END IF;

    IF p_allocation_mode = 'per_person' THEN
        v_per_person_paise := p_input_amount_paise;
        v_total_cost_paise := p_input_amount_paise * v_eligible_count;
    ELSIF p_allocation_mode = 'total_pool' THEN
        v_total_cost_paise := p_input_amount_paise;
        v_per_person_paise := p_input_amount_paise / v_eligible_count;
        v_remainder_paise := p_input_amount_paise % v_eligible_count;
    ELSE
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_ALLOCATION_MODE', 'error', 'Invalid allocation mode');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'team_id', p_team_id,
        'team_name', v_team_name,
        'allocation_mode', p_allocation_mode,
        'eligible_count', v_eligible_count,
        'excluded_count', v_excluded_count,
        'per_person_amount_paise', v_per_person_paise,
        'total_cost_paise', v_total_cost_paise,
        'remainder_paise', v_remainder_paise,
        'eligible_members', v_eligible_list,
        'excluded_members', v_excluded_list
    );
END;
$$;


-- RPC: award_team_incentive
CREATE OR REPLACE FUNCTION public.award_team_incentive(
    p_team_id UUID,
    p_incentive_type TEXT,
    p_allocation_mode TEXT,
    p_input_amount_paise BIGINT,
    p_include_lead BOOLEAN DEFAULT true,
    p_description TEXT DEFAULT NULL,
    p_internal_note TEXT DEFAULT NULL,
    p_effective_date DATE DEFAULT CURRENT_DATE,
    p_payroll_month INT DEFAULT NULL,
    p_payroll_year INT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_actor_name TEXT;
    v_team_name TEXT;
    v_team_lead_id UUID;
    v_team_active BOOLEAN;
    v_existing_batch_id UUID;
    v_batch_id UUID;
    v_eligible_count INT := 0;
    v_excluded_count INT := 0;
    v_member_record RECORD;
    v_per_person_paise BIGINT := 0;
    v_total_cost_paise BIGINT := 0;
    v_remainder_paise BIGINT := 0;
    v_alloc_amount_paise BIGINT := 0;
    v_member_idx INT := 0;
BEGIN
    -- Authenticate & Authorize caller
    v_actor_id := COALESCE(p_caller_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'error', 'Authentication required');
    END IF;

    SELECT role::text, full_name INTO v_actor_role, v_actor_name
    FROM public.user_profiles
    WHERE id = v_actor_id;

    IF v_actor_role NOT IN ('hr_manager', 'admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'HR permissions required');
    END IF;

    -- Idempotency check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_batch_id
        FROM public.incentive_batches
        WHERE created_by = v_actor_id AND idempotency_key = p_idempotency_key;

        IF v_existing_batch_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'code', 'DUPLICATE_IDEMPOTENT', 'batch_id', v_existing_batch_id);
        END IF;
    END IF;

    -- Lock team row
    SELECT name, team_lead_id, is_active INTO v_team_name, v_team_lead_id, v_team_active
    FROM public.teams
    WHERE id = p_team_id
    FOR SHARE;

    IF v_team_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_NOT_FOUND', 'error', 'Target team does not exist');
    END IF;

    IF NOT v_team_active THEN
        RETURN jsonb_build_object('success', false, 'code', 'TEAM_INACTIVE', 'error', 'Target team is inactive');
    END IF;

    -- Validate input amount
    IF p_input_amount_paise <= 0 OR p_input_amount_paise > 1000000000 THEN
        RETURN jsonb_build_object('success', false, 'code', 'AMOUNT_OUT_OF_RANGE', 'error', 'Amount out of allowed policy range');
    END IF;

    -- Count eligible / excluded members
    FOR v_member_record IN (
        SELECT up.id, up.full_name, up.employee_id AS emp_code, up.is_suspended
        FROM public.team_members tm
        JOIN public.user_profiles up ON up.id = tm.user_id
        WHERE tm.team_id = p_team_id
        ORDER BY up.id ASC
    ) LOOP
        IF v_member_record.is_suspended THEN
            v_excluded_count := v_excluded_count + 1;
        ELSIF NOT p_include_lead AND v_member_record.id = v_team_lead_id THEN
            v_excluded_count := v_excluded_count + 1;
        ELSE
            v_eligible_count := v_eligible_count + 1;
        END IF;
    END LOOP;

    IF v_eligible_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'code', 'NO_ELIGIBLE_MEMBERS', 'error', 'Team has no active eligible members');
    END IF;

    -- Calculate allocations & total pool paise exact division
    IF p_allocation_mode = 'per_person' THEN
        v_per_person_paise := p_input_amount_paise;
        v_total_cost_paise := p_input_amount_paise * v_eligible_count;
    ELSIF p_allocation_mode = 'total_pool' THEN
        v_total_cost_paise := p_input_amount_paise;
        v_per_person_paise := p_input_amount_paise / v_eligible_count;
        v_remainder_paise := p_input_amount_paise % v_eligible_count;
    ELSE
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_ALLOCATION_MODE', 'error', 'Invalid allocation mode');
    END IF;

    -- Insert Batch
    INSERT INTO public.incentive_batches (
        recipient_mode, team_id, team_name_snapshot, allocation_mode, incentive_type,
        description, internal_note, effective_date, payroll_month, payroll_year,
        total_amount_paise, per_person_amount_paise, eligible_member_count, excluded_member_count,
        status, created_by, idempotency_key
    ) VALUES (
        'team', p_team_id, v_team_name, p_allocation_mode, p_incentive_type,
        p_description, p_internal_note, COALESCE(p_effective_date, CURRENT_DATE), p_payroll_month, p_payroll_year,
        v_total_cost_paise, v_per_person_paise, v_eligible_count, v_excluded_count,
        'pending', v_actor_id, p_idempotency_key
    )
    RETURNING id INTO v_batch_id;

    -- Create allocations for eligible members
    FOR v_member_record IN (
        SELECT up.id, up.full_name, up.employee_id AS emp_code, up.is_suspended
        FROM public.team_members tm
        JOIN public.user_profiles up ON up.id = tm.user_id
        WHERE tm.team_id = p_team_id
        ORDER BY up.id ASC
    ) LOOP
        IF NOT v_member_record.is_suspended AND (p_include_lead OR v_member_record.id != v_team_lead_id) THEN
            v_member_idx := v_member_idx + 1;
            v_alloc_amount_paise := v_per_person_paise;
            
            -- Distribute remainder deterministically to first N members by sorted UUID
            IF p_allocation_mode = 'total_pool' AND v_member_idx <= v_remainder_paise THEN
                v_alloc_amount_paise := v_alloc_amount_paise + 1;
            END IF;

            INSERT INTO public.incentive_allocations (
                batch_id, employee_id, employee_name_snapshot, employee_code_snapshot,
                team_id_snapshot, team_name_snapshot, amount_paise, status
            ) VALUES (
                v_batch_id, v_member_record.id, v_member_record.full_name, v_member_record.emp_code,
                p_team_id, v_team_name, v_alloc_amount_paise, 'pending'
            );

            -- Employee notification
            INSERT INTO public.notifications (
                user_id, title, body, type, reference_id, reference_type
            ) VALUES (
                v_member_record.id, 'Team Incentive Awarded',
                format('Your team (%s) received a bonus award of ₹%s.', v_team_name, (v_alloc_amount_paise::numeric / 100.0)::text),
                'info', v_batch_id, 'incentive_batch'
            );
        END IF;
    END LOOP;

    -- Write Batch Audit Log
    INSERT INTO public.audit_logs_hrm (
        actor_id, actor_name, action, table_name, record_id,
        new_data, module, severity
    ) VALUES (
        v_actor_id, COALESCE(v_actor_name, 'HR Manager'), 'CREATE_TEAM_INCENTIVE', 'incentive_batches', v_batch_id,
        jsonb_build_object('batch_id', v_batch_id, 'team_id', p_team_id, 'total_cost_paise', v_total_cost_paise, 'eligible_count', v_eligible_count),
        'Incentives', 'high'
    );

    RETURN jsonb_build_object(
        'success', true,
        'batch_id', v_batch_id,
        'eligible_count', v_eligible_count,
        'excluded_count', v_excluded_count,
        'total_cost_paise', v_total_cost_paise
    );
END;
$$;


-- RPC: transition_incentive_batch
CREATE OR REPLACE FUNCTION public.transition_incentive_batch(
    p_batch_id UUID,
    p_target_action TEXT, -- 'approve', 'reject', 'cancel', 'mark_paid', 'reverse'
    p_expected_status TEXT,
    p_expected_version INT,
    p_reason TEXT DEFAULT NULL,
    p_caller_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role TEXT;
    v_actor_name TEXT;
    v_batch RECORD;
    v_new_status TEXT;
    v_high_value BOOLEAN;
BEGIN
    -- Authenticate caller
    v_actor_id := COALESCE(p_caller_id, auth.uid());
    IF v_actor_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'UNAUTHORIZED', 'error', 'Authentication required');
    END IF;

    SELECT role::text, full_name INTO v_actor_role, v_actor_name
    FROM public.user_profiles
    WHERE id = v_actor_id;

    IF v_actor_role NOT IN ('hr_manager', 'admin', 'super_admin') THEN
        RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Privileged role required');
    END IF;

    -- Lock batch row
    SELECT * INTO v_batch
    FROM public.incentive_batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF v_batch.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'code', 'BATCH_NOT_FOUND', 'error', 'Incentive batch not found');
    END IF;

    -- Verify status & optimistic version
    IF v_batch.status != p_expected_status THEN
        RETURN jsonb_build_object('success', false, 'code', 'STATUS_CONFLICT', 'error', format('Batch status is %s, expected %s', v_batch.status, p_expected_status));
    END IF;

    IF v_batch.version != p_expected_version THEN
        RETURN jsonb_build_object('success', false, 'code', 'VERSION_CONFLICT', 'error', format('Batch version is %s, expected %s', v_batch.version, p_expected_version));
    END IF;

    v_high_value := (v_batch.total_amount_paise > 10000000); -- > ₹1,00,000

    -- Action state machine logic
    CASE p_target_action
        WHEN 'approve' THEN
            IF v_batch.status != 'pending' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'error', 'Only pending awards can be approved');
            END IF;
            -- Maker-Checker enforcement: Creator cannot approve their own high-value award unless admin/super_admin
            IF v_batch.created_by = v_actor_id AND v_high_value AND v_actor_role NOT IN ('admin', 'super_admin') THEN
                RETURN jsonb_build_object('success', false, 'code', 'MAKER_CHECKER_VIOLATION', 'error', 'Creator cannot approve self-awarded high-value incentive');
            END IF;
            v_new_status := 'approved';

            UPDATE public.incentive_batches
            SET status = v_new_status, approved_by = v_actor_id, approved_at = now(), version = version + 1, updated_at = now()
            WHERE id = p_batch_id;

        WHEN 'reject' THEN
            IF v_batch.status != 'pending' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'error', 'Only pending awards can be rejected');
            END IF;
            IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
                RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Reason is required for rejection');
            END IF;
            v_new_status := 'rejected';

            UPDATE public.incentive_batches
            SET status = v_new_status, rejected_by = v_actor_id, rejected_at = now(), rejection_reason = p_reason, version = version + 1, updated_at = now()
            WHERE id = p_batch_id;

        WHEN 'cancel' THEN
            IF v_batch.status NOT IN ('pending', 'approved') THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'error', 'Paid/reversed awards cannot be cancelled');
            END IF;
            IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
                RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Reason is required for cancellation');
            END IF;
            v_new_status := 'cancelled';

            UPDATE public.incentive_batches
            SET status = v_new_status, cancelled_by = v_actor_id, cancelled_at = now(), cancellation_reason = p_reason, version = version + 1, updated_at = now()
            WHERE id = p_batch_id;

        WHEN 'mark_paid' THEN
            IF v_batch.status != 'approved' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'error', 'Only approved awards can be marked paid');
            END IF;
            v_new_status := 'paid';

            UPDATE public.incentive_batches
            SET status = v_new_status, paid_by = v_actor_id, paid_at = now(), version = version + 1, updated_at = now()
            WHERE id = p_batch_id;

        WHEN 'reverse' THEN
            IF v_batch.status != 'paid' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'error', 'Only paid awards can be reversed');
            END IF;
            IF v_actor_role NOT IN ('admin', 'super_admin') THEN
                RETURN jsonb_build_object('success', false, 'code', 'FORBIDDEN', 'error', 'Only Admins can reverse paid financial awards');
            END IF;
            IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
                RETURN jsonb_build_object('success', false, 'code', 'REASON_REQUIRED', 'error', 'Reason is required for reversal');
            END IF;
            v_new_status := 'reversed';

            UPDATE public.incentive_batches
            SET status = v_new_status, reversed_by = v_actor_id, reversed_at = now(), reversal_reason = p_reason, version = version + 1, updated_at = now()
            WHERE id = p_batch_id;

        ELSE
            RETURN jsonb_build_object('success', false, 'code', 'INVALID_ACTION', 'error', 'Unknown action');
    END CASE;

    -- Synchronize status to all child allocations
    UPDATE public.incentive_allocations
    SET status = v_new_status,
        paid_at = CASE WHEN v_new_status = 'paid' THEN now() ELSE paid_at END,
        updated_at = now()
    WHERE batch_id = p_batch_id;

    -- Audit Log
    INSERT INTO public.audit_logs_hrm (
        actor_id, actor_name, action, table_name, record_id,
        old_data, new_data, module, severity
    ) VALUES (
        v_actor_id, COALESCE(v_actor_name, 'HR Actor'), upper(p_target_action), 'incentive_batches', p_batch_id,
        jsonb_build_object('status', v_batch.status, 'version', v_batch.version),
        jsonb_build_object('status', v_new_status, 'version', v_batch.version + 1, 'reason', p_reason),
        'Incentives', 'high'
    );

    RETURN jsonb_build_object('success', true, 'batch_id', p_batch_id, 'new_status', v_new_status, 'version', v_batch.version + 1);
END;
$$;

-- Revoke RPC execute from PUBLIC and anon
REVOKE EXECUTE ON FUNCTION public.award_individual_incentive FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.preview_team_incentive FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_team_incentive FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transition_incentive_batch FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.award_individual_incentive TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_team_incentive TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_team_incentive TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_incentive_batch TO authenticated, service_role;

COMMIT;
