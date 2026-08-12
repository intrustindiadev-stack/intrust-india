-- ============================================================================
-- MIGRATION: 20260812_p9_profile_sync_avatar_fix.sql
--
-- PURPOSE:
--   1. Fix the infinite recursion on user_profiles UPDATE caused by is_admin().
--   2. Fix avatar uploads failing due to missing UPDATE privileges for upsert.
-- ============================================================================

BEGIN;

-- ─── 1. Fix user_profiles UPDATE infinite recursion ──────────────────────────
-- The previous policy used is_admin(), which queried user_profiles, triggering
-- RLS again and causing an infinite recursion 500 error on profile sync.
-- We replace it with has_role(), which is SECURITY DEFINER and bypasses RLS.

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  USING  (auth.uid() = id OR public.has_role(ARRAY['admin', 'super_admin']))
  WITH CHECK (auth.uid() = id OR public.has_role(ARRAY['admin', 'super_admin']));

-- ─── 2. Fix avatars storage bucket UPDATE privileges ─────────────────────────
-- The previous lockdown migration restricted avatars to FOR INSERT only.
-- However, the frontend uses { upsert: true } to overwrite existing avatars,
-- which requires UPDATE privileges.

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Note: The FOR INSERT policy "Users can upload their own avatar" already exists
-- from the previous migration and remains valid for new files.

COMMIT;
