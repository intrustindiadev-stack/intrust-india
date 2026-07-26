-- ===================================================
-- Fix HRM RLS Role Consistency Migration
-- Ensures user_profiles select and update policies allow 'hr', 'hr_manager', 'admin', 'super_admin'
-- ===================================================

DROP POLICY IF EXISTS "HR managers can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "HR managers can update all profiles" ON public.user_profiles;

CREATE POLICY "HR managers can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
    IN ('hr', 'hr_manager', 'admin', 'super_admin')
  );

CREATE POLICY "HR managers can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
    IN ('hr', 'hr_manager', 'admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
    IN ('hr', 'hr_manager', 'admin', 'super_admin')
  );
