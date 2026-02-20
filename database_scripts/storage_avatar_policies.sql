-- Run this AFTER creating the 'avatars' bucket via Supabase Dashboard UI
-- (Storage → New Bucket → name: avatars → Public: ON)

-- Drop old policies first (safe to re-run)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- 1. Public read
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Authenticated users can upload into their own folder (avatars/{userId}/*)
-- Uses name LIKE instead of foldername() for broader compatibility
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
);

-- 3. Update own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
);

-- 4. Delete own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND name LIKE (auth.uid()::text || '/%')
);
