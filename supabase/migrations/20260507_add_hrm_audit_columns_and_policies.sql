-- Step 1: Add columns
ALTER TABLE public.audit_logs_hrm
ADD COLUMN IF NOT EXISTS module TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS actor_name TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_hrm_created_at ON public.audit_logs_hrm(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hrm_actor_id ON public.audit_logs_hrm(actor_id);

-- Step 2: Add RLS Policies
DROP POLICY IF EXISTS "hr_read_audit_logs_hrm" ON public.audit_logs_hrm;
DROP POLICY IF EXISTS "hr_insert_audit_logs_hrm" ON public.audit_logs_hrm;

CREATE POLICY "hr_read_audit_logs_hrm" ON public.audit_logs_hrm
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('hr_manager', 'admin', 'super_admin')
  )
);

CREATE POLICY "hr_insert_audit_logs_hrm" ON public.audit_logs_hrm
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
    AND role IN ('hr_manager', 'admin', 'super_admin')
  )
);
