-- ══════════════════════════════════════════════════════════════════
-- InTrust Platform — Production Safe Migration v2
-- Date: 2026-04-28  |  Safe to run multiple times (idempotent)
--
-- ⚠️  IMPORTANT: Paste this ENTIRE script and run it as one block.
--     ALTER TYPE ... ADD VALUE cannot run inside a transaction,
--     so this script is intentionally split into two parts:
--
--     PART A  — Enum additions (runs outside transaction, safe)
--     PART B  — Everything else (tables, columns, RLS, indexes)
-- ══════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════
--  PART A: Extend user_role enum
--  (Must be outside BEGIN/COMMIT block)
-- ════════════════════════════════════════════

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_exec';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr_admin';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'employee';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'crm_user';


-- ════════════════════════════════════════════
--  PART B: All structural changes
-- ════════════════════════════════════════════

-- ────────────────────────────────────────────
-- B1: Fix service_role access (stops 403 errors)
-- ────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='career_applications') THEN
    EXECUTE 'GRANT ALL ON TABLE public.career_applications TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='career_job_roles') THEN
    EXECUTE 'GRANT ALL ON TABLE public.career_job_roles TO service_role';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='crm_leads') THEN
    EXECUTE 'GRANT ALL ON TABLE public.crm_leads TO service_role';
  END IF;
END $$;

-- ────────────────────────────────────────────
-- B2: Extend user_profiles with employee fields
-- ────────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS department       text,
  ADD COLUMN IF NOT EXISTS employee_id      text,
  ADD COLUMN IF NOT EXISTS joining_date     date,
  ADD COLUMN IF NOT EXISTS employment_type  text DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS city             text,
  ADD COLUMN IF NOT EXISTS state            text,
  ADD COLUMN IF NOT EXISTS base_salary      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_pct   numeric(5,2) DEFAULT 0;

-- ────────────────────────────────────────────
-- B3: Extend career_applications with HR fields
-- ────────────────────────────────────────────
ALTER TABLE public.career_applications
  ADD COLUMN IF NOT EXISTS user_id               uuid,
  ADD COLUMN IF NOT EXISTS linkedin_url          text,
  ADD COLUMN IF NOT EXISTS expected_salary_min   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_salary_max   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interview_date         timestamptz,
  ADD COLUMN IF NOT EXISTS interview_notes        text,
  ADD COLUMN IF NOT EXISTS offered_salary         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percent     numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joining_bonus          integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offer_letter_notes     text,
  ADD COLUMN IF NOT EXISTS panel_access           text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hired_at               timestamptz,
  ADD COLUMN IF NOT EXISTS status_history         jsonb DEFAULT '[]'::jsonb;

-- ────────────────────────────────────────────
-- B4: Create leave_requests
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type    text        NOT NULL,
  from_date     date        NOT NULL,
  to_date       date        NOT NULL,
  reason        text,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','approved','rejected')),
  reviewed_by   uuid,
  review_note   text,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- B5: Create attendance
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.attendance (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            date        NOT NULL,
  check_in        timestamptz,
  check_out       timestamptz,
  status          text        NOT NULL DEFAULT 'present'
                              CHECK (status IN ('present','absent','late','half_day','holiday','wfh')),
  notes           text,
  override_by     uuid,
  override_reason text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, date)
);

-- ────────────────────────────────────────────
-- B6: Create salary_records
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.salary_records (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month         integer     NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          integer     NOT NULL CHECK (year >= 2020),
  base_salary   integer     NOT NULL DEFAULT 0,
  hra           integer     NOT NULL DEFAULT 0,
  allowances    integer     NOT NULL DEFAULT 0,
  deductions    integer     NOT NULL DEFAULT 0,
  net_salary    integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','processed','paid')),
  payslip_url   text,
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, month, year)
);

-- ────────────────────────────────────────────
-- B7: Create lead_interactions
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid        NOT NULL,
  user_id           uuid        REFERENCES auth.users(id),
  interaction_type  text        NOT NULL DEFAULT 'note'
                                CHECK (interaction_type IN ('call','email','meeting','note','whatsapp')),
  note              text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- B8: Create training_materials
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_materials (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text        NOT NULL,
  description   text,
  category      text,
  content_type  text        NOT NULL DEFAULT 'document'
                            CHECK (content_type IN ('pdf','video','link','quiz','document')),
  content_url   text,
  is_mandatory  boolean     NOT NULL DEFAULT false,
  created_by    uuid        REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- B9: Enable RLS on all new tables
-- ────────────────────────────────────────────
ALTER TABLE public.leave_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_interactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────
-- B10: RLS Policies
--   NOTE: role::text cast is used throughout to avoid enum
--   comparison issues across Postgres versions.
--   DROP IF EXISTS first to make this script re-runnable.
-- ────────────────────────────────────────────

--- leave_requests ---
DROP POLICY IF EXISTS "employee_view_own_leaves"  ON public.leave_requests;
DROP POLICY IF EXISTS "employee_insert_leave"      ON public.leave_requests;
DROP POLICY IF EXISTS "hr_manage_all_leaves"       ON public.leave_requests;

CREATE POLICY "employee_view_own_leaves"
  ON public.leave_requests FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "employee_insert_leave"
  ON public.leave_requests FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "hr_manage_all_leaves"
  ON public.leave_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin','super_admin','hr_admin')
    )
  );

--- attendance ---
DROP POLICY IF EXISTS "employee_view_own_attendance"   ON public.attendance;
DROP POLICY IF EXISTS "employee_insert_attendance"     ON public.attendance;
DROP POLICY IF EXISTS "employee_update_own_attendance" ON public.attendance;
DROP POLICY IF EXISTS "hr_manage_all_attendance"       ON public.attendance;

CREATE POLICY "employee_view_own_attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "employee_insert_attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "employee_update_own_attendance"
  ON public.attendance FOR UPDATE
  USING (auth.uid() = employee_id AND check_out IS NULL);

CREATE POLICY "hr_manage_all_attendance"
  ON public.attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin','super_admin','hr_admin')
    )
  );

--- salary_records ---
DROP POLICY IF EXISTS "employee_view_own_salary" ON public.salary_records;
DROP POLICY IF EXISTS "hr_manage_all_salary"     ON public.salary_records;

CREATE POLICY "employee_view_own_salary"
  ON public.salary_records FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "hr_manage_all_salary"
  ON public.salary_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin','super_admin','hr_admin')
    )
  );

--- lead_interactions ---
DROP POLICY IF EXISTS "sales_view_interactions"   ON public.lead_interactions;
DROP POLICY IF EXISTS "sales_insert_interactions" ON public.lead_interactions;

CREATE POLICY "sales_view_interactions"
  ON public.lead_interactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin','super_admin','sales_manager')
    )
  );

CREATE POLICY "sales_insert_interactions"
  ON public.lead_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

--- training_materials ---
DROP POLICY IF EXISTS "all_view_training"  ON public.training_materials;
DROP POLICY IF EXISTS "hr_manage_training" ON public.training_materials;

CREATE POLICY "all_view_training"
  ON public.training_materials FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "hr_manage_training"
  ON public.training_materials FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin','super_admin','hr_admin')
    )
  );

-- ────────────────────────────────────────────
-- B11: Performance indexes
-- ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status   ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee     ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date         ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_salary_employee         ON public.salary_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_year_month       ON public.salary_records(year, month);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead  ON public.lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_career_user_id          ON public.career_applications(user_id);

-- ────────────────────────────────────────────
-- B12: Verify — check all tables exist
-- ────────────────────────────────────────────
DO $$
DECLARE
  tbl  text;
  tbls text[] := ARRAY[
    'leave_requests','attendance','salary_records',
    'lead_interactions','training_materials'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tbl
    ) THEN
      RAISE NOTICE '✅  %', tbl;
    ELSE
      RAISE NOTICE '❌  MISSING: %', tbl;
    END IF;
  END LOOP;
  RAISE NOTICE '🎉  Migration v2 complete!';
END $$;
