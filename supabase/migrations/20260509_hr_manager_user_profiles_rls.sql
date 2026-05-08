CREATE POLICY "HR managers can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    IN ('hr_manager', 'admin', 'super_admin')
  );

CREATE POLICY "HR managers can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    IN ('hr_manager', 'admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid())
    IN ('hr_manager', 'admin', 'super_admin')
  );
