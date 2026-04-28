-- ═══════════════════════════════════════════════════════════════
-- InTrust Platform — Safe Additive Migration
-- Run in: https://supabase.com/dashboard/project/bhgbylyzlwmmabegxlfc/sql
-- ALL statements use IF NOT EXISTS / IF EXISTS — zero risk to existing data
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Fix service_role GRANT (stops 403 errors on career/crm tables) ──
GRANT ALL ON career_applications TO service_role;
GRANT ALL ON career_job_roles TO service_role;
GRANT ALL ON crm_leads TO service_role;

-- ── 2. Add employee fields to user_profiles ──
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS department        text,
  ADD COLUMN IF NOT EXISTS employee_id       text,
  ADD COLUMN IF NOT EXISTS joining_date      date,
  ADD COLUMN IF NOT EXISTS employment_type   text DEFAULT 'full_time',
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS state             text,
  ADD COLUMN IF NOT EXISTS base_salary       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_pct    numeric(5,2) DEFAULT 0;

-- ── 3. Add hire fields to career_applications ──
ALTER TABLE career_applications
  ADD COLUMN IF NOT EXISTS interview_date      timestamptz,
  ADD COLUMN IF NOT EXISTS offered_salary      integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percent  numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joining_bonus       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offer_letter_notes  text,
  ADD COLUMN IF NOT EXISTS linkedin_url        text,
  ADD COLUMN IF NOT EXISTS status_history      jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hired_at            timestamptz,
  ADD COLUMN IF NOT EXISTS interview_notes     text,
  ADD COLUMN IF NOT EXISTS expected_salary_min integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_salary_max integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS panel_access        text[] DEFAULT '{}';

-- ── 4. Create leave_requests table ──
CREATE TABLE IF NOT EXISTS leave_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  leave_type     text NOT NULL,
  from_date      date NOT NULL,
  to_date        date NOT NULL,
  reason         text,
  status         text DEFAULT 'pending',
  reviewed_by    uuid,
  review_note    text,
  reviewed_at    timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ── 5. Create attendance table ──
CREATE TABLE IF NOT EXISTS attendance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date            date NOT NULL,
  check_in        timestamptz,
  check_out       timestamptz,
  status          text DEFAULT 'present',
  notes           text,
  override_by     uuid,
  override_reason text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (employee_id, date)
);

-- ── 6. Create salary_records table ──
CREATE TABLE IF NOT EXISTS salary_records (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  month          integer NOT NULL,
  year           integer NOT NULL,
  base_salary    integer DEFAULT 0,
  hra            integer DEFAULT 0,
  allowances     integer DEFAULT 0,
  deductions     integer DEFAULT 0,
  net_salary     integer DEFAULT 0,
  status         text DEFAULT 'pending',
  payslip_url    text,
  processed_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (employee_id, month, year)
);

-- ── 7. Create lead_interactions table (CRM notes history) ──
CREATE TABLE IF NOT EXISTS lead_interactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid NOT NULL,
  user_id          uuid REFERENCES auth.users(id),
  interaction_type text DEFAULT 'note',
  note             text NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- ── 8. Create training_materials table ──
CREATE TABLE IF NOT EXISTS training_materials (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  category      text,
  content_type  text DEFAULT 'document',
  content_url   text,
  is_mandatory  boolean DEFAULT false,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

-- ── 9. Enable RLS on new tables ──
ALTER TABLE leave_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_materials ENABLE ROW LEVEL SECURITY;

-- ── 10. RLS Policies ──

-- leave_requests
CREATE POLICY IF NOT EXISTS "employee_view_own_leaves"
  ON leave_requests FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY IF NOT EXISTS "employee_insert_leave"
  ON leave_requests FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY IF NOT EXISTS "hr_all_leaves"
  ON leave_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()
            AND role IN ('admin','super_admin','hr_manager'))
  );

-- attendance
CREATE POLICY IF NOT EXISTS "employee_view_own_attendance"
  ON attendance FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY IF NOT EXISTS "employee_insert_attendance"
  ON attendance FOR INSERT WITH CHECK (auth.uid() = employee_id);
CREATE POLICY IF NOT EXISTS "hr_all_attendance"
  ON attendance FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()
            AND role IN ('admin','super_admin','hr_manager'))
  );

-- salary_records
CREATE POLICY IF NOT EXISTS "employee_view_own_salary"
  ON salary_records FOR SELECT USING (auth.uid() = employee_id);
CREATE POLICY IF NOT EXISTS "hr_all_salary"
  ON salary_records FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()
            AND role IN ('admin','super_admin','hr_manager'))
  );

-- lead_interactions
CREATE POLICY IF NOT EXISTS "sales_view_interactions"
  ON lead_interactions FOR SELECT USING (auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()
            AND role IN ('admin','super_admin','sales_manager'))
  );
CREATE POLICY IF NOT EXISTS "sales_insert_interaction"
  ON lead_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- training_materials
CREATE POLICY IF NOT EXISTS "all_view_training"
  ON training_materials FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "hr_manage_training"
  ON training_materials FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()
            AND role IN ('admin','super_admin','hr_manager'))
  );
