-- ============================================================
-- Migration: 20260520_consolidate_user_profiles_rls
-- Purpose  : Drop 5 redundant duplicate policies and upgrade
--            the 2 canonical "own" policies to include the
--            is_admin() branch so no coverage is lost.
-- Final    : Exactly 6 policies remain on user_profiles.
-- ============================================================

-- -------------------------------------------------------
-- 1a. Drop the 5 redundant / duplicate policies
-- -------------------------------------------------------
DROP POLICY IF EXISTS "safe_insert_policy"    ON public.user_profiles;
DROP POLICY IF EXISTS "safe_view_policy"       ON public.user_profiles;
DROP POLICY IF EXISTS "view_profiles_policy"   ON public.user_profiles;
DROP POLICY IF EXISTS "safe_update_policy"     ON public.user_profiles;
DROP POLICY IF EXISTS "update_profiles_policy" ON public.user_profiles;

-- -------------------------------------------------------
-- 1b. Upgrade SELECT canonical policy to include is_admin()
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_admin());

-- -------------------------------------------------------
-- 1c. Upgrade UPDATE canonical policy to include is_admin()
-- -------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- -------------------------------------------------------
-- 1d. Verification (run manually after apply)
-- -------------------------------------------------------
/*
-- Expected: exactly 6 rows
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- Expected: 0 rows (anon cannot SELECT)
SET ROLE anon;
SELECT count(*) FROM public.user_profiles;
RESET ROLE;
*/
