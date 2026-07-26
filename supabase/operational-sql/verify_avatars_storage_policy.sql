-- ============================================================================
-- SQL Migration / Verification: Avatars Storage Bucket & RLS Policies
-- ============================================================================
-- This script ensures that the 'avatars' storage bucket is created, configured
-- as a PUBLIC bucket (required for getPublicUrl() to work without signed token
-- expiration), and has proper RLS policies for read/write/update access.
-- ============================================================================

-- 1. Ensure the 'avatars' bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5 MB limit
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing potentially conflicting policies for the 'avatars' bucket
DROP POLICY IF EXISTS "Public Read Access for Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Can Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Update Own Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users Can Delete Own Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Owner Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Owner Delete" ON storage.objects;

-- 4. Create RLS Policies for 'avatars' bucket

-- (A) Public Read Access: Anyone (including anonymous users/guests) can view avatars
CREATE POLICY "Avatar Public Read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- (B) Authenticated Upload: Any authenticated user can upload avatar files
CREATE POLICY "Avatar Authenticated Insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' 
    AND (
        -- Either storing directly or under user ID folder
        (storage.foldername(name))[1] = auth.uid()::text
        OR auth.role() = 'authenticated'
    )
);

-- (C) Owner Update: Authenticated users can overwrite/upsert images in their folder or that they own
CREATE POLICY "Avatar Owner Update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (owner = auth.uid() OR (storage.foldername(name))[1] = auth.uid()::text)
)
WITH CHECK (
    bucket_id = 'avatars' 
    AND (owner = auth.uid() OR (storage.foldername(name))[1] = auth.uid()::text)
);

-- (D) Owner Delete: Authenticated users can delete their own avatars
CREATE POLICY "Avatar Owner Delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' 
    AND (owner = auth.uid() OR (storage.foldername(name))[1] = auth.uid()::text)
);

-- 5. Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Successfully verified and hardened RLS policies for public avatars storage bucket.';
END $$;
