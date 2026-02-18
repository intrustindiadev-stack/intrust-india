-- SprintVerify Integration (Final Schema - Fixed)

-- 1. SprintVerify Columns (Safe to run multiple times)
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS sprint_verify_ref_id TEXT,
ADD COLUMN IF NOT EXISTS sprint_verify_status TEXT,
ADD COLUMN IF NOT EXISTS sprint_verify_data JSONB,
ADD COLUMN IF NOT EXISTS sprint_verify_timestamp TIMESTAMP WITH TIME ZONE;

-- 2. Document Upload Columns
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_back_url TEXT;

-- 3. Storage Bucket (Attempt to create, might fail if not admin)
-- If this fails, please Create Bucket 'kyc-documents' manually in Supabase Dashboard.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kyc-documents', 
    'kyc-documents', 
    false, 
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies (Safely handled)
-- We DO NOT enable RLS on storage.objects as it requires superuser.
-- We only try to drop/create policies.

DROP POLICY IF EXISTS "Users can upload own KYC docs" ON storage.objects;
CREATE POLICY "Users can upload own KYC docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can view own KYC docs" ON storage.objects;
CREATE POLICY "Users can view own KYC docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);
