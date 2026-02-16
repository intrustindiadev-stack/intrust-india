-- SprintVerify Integration & KYC Storage Update
-- Author: Antigravity AI
-- Date: 2026-02-14

-- =====================================================
-- STEP 1: Add SprintVerify Tracking Columns
-- =====================================================

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS sprint_verify_ref_id TEXT,
ADD COLUMN IF NOT EXISTS sprint_verify_status TEXT,
ADD COLUMN IF NOT EXISTS sprint_verify_data JSONB;

-- =====================================================
-- STEP 2: Add Document URL Columns (if not exist)
-- =====================================================

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS selfie_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_document_back_url TEXT;

-- =====================================================
-- STEP 3: Create Storage Bucket for KYC Documents
-- =====================================================

-- Note: Storage buckets usually need to be created in the dashboard or via API
-- But we can try to insert into storage.buckets if permissions allow.
-- If this fails, user must create 'kyc-documents' bucket manually.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kyc-documents', 
    'kyc-documents', 
    false, -- Private bucket for security
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 4: Setup Storage Policies (RLS)
-- =====================================================

-- Enable RLS on objects (usually enabled by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own KYC documents
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own KYC documents
CREATE POLICY "Users can view their own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all KYC documents
-- Assuming 'app_admins' table exists and has user_id
CREATE POLICY "Admins can view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' AND
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
);
