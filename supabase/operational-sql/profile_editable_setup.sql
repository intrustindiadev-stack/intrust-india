-- ============================================================
-- Profile Editable Setup
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- 1. Add avatar_url column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Allow users to UPDATE their own profile row
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Ensure SELECT policy exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_profiles'
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile"
        ON public.user_profiles
        FOR SELECT
        USING (auth.uid() = id);
    END IF;
END $$;

-- ============================================================
-- Storage: avatars bucket + policies
-- The bucket itself should be created via Supabase Dashboard:
--   Storage → New Bucket → name: "avatars" → Public: ON
-- Then run the policies below.
-- ============================================================

-- Allow anyone to read avatar images (public bucket)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated user to upload into their own folder (avatars/{userId}/*)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated user to overwrite their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated user to delete their own avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
);
