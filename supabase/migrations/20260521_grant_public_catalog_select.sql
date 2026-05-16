-- =============================================================================
-- Migration: 20260521_grant_public_catalog_select
-- Purpose:   Grant minimum necessary privileges to anon/authenticated roles
--            for three tables whose RLS policies are correct but whose GRANTs
--            were never issued, causing PostgREST to return 401/403 for all
--            unauthenticated and authenticated callers.
--
-- Tables affected:
--   career_job_roles    — public catalog, admin-managed
--   platform_settings   — public read-only config
--   career_applications — user-owned rows, admin-managed
--
-- No RLS policies are modified; all existing policies are correct.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section A: career_job_roles
--   Allows: anonymous visitors + logged-in customers to READ active roles
--           (RLS policy "Anyone can view active job roles" gates to is_active=true)
--   Allows: admin/HR users to INSERT/UPDATE/DELETE via
--           "Admins can manage job roles" ALL policy
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.career_job_roles TO anon, authenticated;
GRANT ALL    ON public.career_job_roles TO authenticated;

-- -----------------------------------------------------------------------------
-- Section B: platform_settings
--   Allows: ShopHubClient, cart page, and storefront pages to read settings
--           using the anon key without requiring a service-role client.
--           (RLS policy "Allow public read access to platform settings" USING (true))
-- -----------------------------------------------------------------------------
GRANT SELECT ON public.platform_settings TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- Section C: career_applications
--   Allows: logged-in users to submit and view their own applications.
--           (RLS policies gate rows to auth.uid() = user_id)
--   GRANT ALL also covers the admin/HR "Admins can manage all applications"
--   ALL policy, consistent with service_role grants elsewhere.
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.career_applications TO authenticated;
GRANT ALL                    ON public.career_applications TO authenticated;

-- -----------------------------------------------------------------------------
-- Section D: Inline verification — fail loudly if any GRANT did not take effect
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT has_table_privilege('anon', 'public.career_job_roles', 'SELECT') THEN
    RAISE EXCEPTION
      'GRANT verification failed: anon does not have SELECT on public.career_job_roles';
  END IF;

  IF NOT has_table_privilege('anon', 'public.platform_settings', 'SELECT') THEN
    RAISE EXCEPTION
      'GRANT verification failed: anon does not have SELECT on public.platform_settings';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.career_applications', 'SELECT') THEN
    RAISE EXCEPTION
      'GRANT verification failed: authenticated does not have SELECT on public.career_applications';
  END IF;
END $$;

-- =============================================================================
-- Section E: Post-apply audit query (copy-paste into Supabase SQL editor)
--
-- Run this after the migration to confirm no other public-facing tables are
-- silently missing GRANTs to anon or authenticated.
--
-- SELECT
--   t.table_schema,
--   t.table_name,
--   r.role_name,
--   has_table_privilege(r.role_name, t.table_schema || '.' || t.table_name, 'SELECT') AS can_select
-- FROM information_schema.tables t
-- CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(role_name)
-- WHERE t.table_schema = 'public'
--   AND t.table_type = 'BASE TABLE'
-- ORDER BY t.table_name, r.role_name;
--
-- Expected: every row your RLS policies intend to expose should show can_select = true.
-- =============================================================================
