-- ===================================================
-- Fix Infinite Recursion in user_profiles RLS policies
-- ===================================================

-- The previous migration (20260722_fix_hrm_rls_role_consistency.sql) introduced an infinite recursion bug
-- by querying user_profiles from within a user_profiles SELECT policy.
-- This caused profile fetches for ALL authenticated users to fail, resulting in users falling back 
-- to the customer layout.

DROP POLICY IF EXISTS "HR managers can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "HR managers can update all profiles" ON public.user_profiles;

-- Use JWT user_metadata to determine the role securely without triggering recursive lookups.
CREATE POLICY "HR managers can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('hr', 'hr_manager', 'admin', 'super_admin')
  );

CREATE POLICY "HR managers can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('hr', 'hr_manager', 'admin', 'super_admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('hr', 'hr_manager', 'admin', 'super_admin')
  );
