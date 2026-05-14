-- Fix RLS policies to grant hr_manager access to career applications and job roles

DROP POLICY IF EXISTS "Admins can manage all applications" ON public.career_applications;
CREATE POLICY "Admins can manage all applications"
  ON public.career_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin', 'super_admin', 'hr_manager')
    )
  );

DROP POLICY IF EXISTS "Admins can manage job roles" ON public.career_job_roles;
CREATE POLICY "Admins can manage job roles"
  ON public.career_job_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin', 'super_admin', 'hr_manager')
    )
  );
