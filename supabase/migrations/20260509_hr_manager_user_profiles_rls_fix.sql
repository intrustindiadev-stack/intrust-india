CREATE OR REPLACE FUNCTION public.has_hr_manager_access()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role IN ('hr_manager', 'admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "HR managers can view all profiles" ON public.user_profiles;
CREATE POLICY "HR managers can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    public.has_hr_manager_access()
  );

DROP POLICY IF EXISTS "HR managers can update all profiles" ON public.user_profiles;
CREATE POLICY "HR managers can update all profiles"
  ON public.user_profiles FOR UPDATE
  USING (
    public.has_hr_manager_access()
  )
  WITH CHECK (
    public.has_hr_manager_access()
  );
