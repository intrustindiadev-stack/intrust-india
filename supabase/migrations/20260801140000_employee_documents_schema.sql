-- Drop existing unused employee_documents table from old schema if it exists
DROP TABLE IF EXISTS public.employee_documents CASCADE;
DROP TYPE IF EXISTS employee_document_type CASCADE;
DROP TYPE IF EXISTS employee_document_status CASCADE;

-- Create Enum for document types
CREATE TYPE employee_document_type AS ENUM ('aadhaar', 'pan', 'bank_proof', 'education', 'other');
CREATE TYPE employee_document_status AS ENUM ('pending', 'approved', 'rejected');

-- Create employee_documents table referencing user_profiles
CREATE TABLE public.employee_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    document_type employee_document_type NOT NULL,
    document_number TEXT,
    file_path TEXT NOT NULL,
    status employee_document_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX idx_employee_documents_user_id ON public.employee_documents(user_id);
CREATE INDEX idx_employee_documents_status ON public.employee_documents(status);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can read their own documents
CREATE POLICY "Employees can read their own documents"
    ON public.employee_documents
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Employees can insert their own documents
CREATE POLICY "Employees can insert their own documents"
    ON public.employee_documents
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Employees can update their own documents (e.g. re-upload after rejection)
CREATE POLICY "Employees can update their own documents"
    ON public.employee_documents
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: HR/Admins can read all documents
CREATE POLICY "HR and Admins can read all documents"
    ON public.employee_documents
    FOR SELECT
    USING (
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
    );

-- Policy: HR/Admins can update all documents (for approval/rejection)
CREATE POLICY "HR and Admins can update all documents"
    ON public.employee_documents
    FOR UPDATE
    USING (
        (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
    );

-- Create Storage Bucket for employee documents (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS

-- 1. Policy: Employees can upload to their own folder
CREATE POLICY "Employees can upload to their own folder"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'employee-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 2. Policy: Employees can read their own files
CREATE POLICY "Employees can read their own files"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'employee-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 3. Policy: Employees can update (overwrite) their own files
CREATE POLICY "Employees can update their own files"
    ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'employee-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- 4. Policy: HR and Admins can read all employee documents
CREATE POLICY "HR and Admins can read all employee documents"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'employee-documents' 
        AND (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
    );
