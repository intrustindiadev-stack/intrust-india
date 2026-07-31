-- Drop existing unused employee_documents table from old schema if it exists
DROP TABLE IF EXISTS public.employee_documents CASCADE;
DROP TYPE IF EXISTS employee_document_type CASCADE;
DROP TYPE IF EXISTS employee_document_status CASCADE;

CREATE TYPE kyc_submission_status AS ENUM ('draft', 'pending', 'approved', 'rejected');

CREATE TABLE public.kyc_document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type TEXT NOT NULL UNIQUE, -- e.g. 'aadhaar', 'pan'
    label TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT true,
    max_files INTEGER DEFAULT 1,
    allowed_mime_types TEXT[] DEFAULT ARRAY['application/pdf', 'image/jpeg', 'image/png'],
    max_file_size_bytes BIGINT DEFAULT 5242880, -- 5MB
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed basic requirements
INSERT INTO public.kyc_document_requirements (doc_type, label, description, max_files) VALUES
('aadhaar', 'Aadhaar Card', 'Please upload both front and back sides if applicable.', 2),
('pan', 'PAN Card', 'Clear image of your PAN card.', 1),
('bank_proof', 'Bank Proof', 'Cancelled cheque or passbook first page.', 1),
('education', 'Educational Certificates', 'Highest degree certificate.', 3)
ON CONFLICT (doc_type) DO NOTHING;

CREATE TABLE public.kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES public.kyc_document_requirements(id) ON DELETE RESTRICT,
    status kyc_submission_status NOT NULL DEFAULT 'draft',
    document_number TEXT,
    version INTEGER NOT NULL DEFAULT 1, -- for optimistic locking
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, requirement_id) -- only one active submission stream per requirement
);

CREATE TABLE public.kyc_submission_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.kyc_document_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    previous_status kyc_submission_status,
    new_status kyc_submission_status NOT NULL,
    rejection_reason TEXT,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- RLS
ALTER TABLE public.kyc_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submission_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_document_reviews ENABLE ROW LEVEL SECURITY;

-- Requirements RLS
CREATE POLICY "Everyone can view requirements" ON public.kyc_document_requirements FOR SELECT USING (true);

-- Submissions RLS
CREATE POLICY "Employees can view own submissions" ON public.kyc_submissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Employees can insert own submissions" ON public.kyc_submissions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Employees can update own submissions" ON public.kyc_submissions FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "HR/Admin can view all submissions" ON public.kyc_submissions FOR SELECT USING ((SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin'));
CREATE POLICY "HR/Admin can update submissions" ON public.kyc_submissions FOR UPDATE USING ((SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin'));

-- Files RLS
CREATE POLICY "Employees can view own files" ON public.kyc_submission_files FOR SELECT USING (EXISTS (SELECT 1 FROM public.kyc_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid()));
CREATE POLICY "Employees can insert own files" ON public.kyc_submission_files FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.kyc_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid()));
CREATE POLICY "Employees can delete own files" ON public.kyc_submission_files FOR DELETE USING (EXISTS (SELECT 1 FROM public.kyc_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid() AND s.status IN ('draft', 'rejected')));
CREATE POLICY "HR/Admin can view all files" ON public.kyc_submission_files FOR SELECT USING ((SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin'));

-- Reviews RLS
CREATE POLICY "Employees can view own reviews" ON public.kyc_document_reviews FOR SELECT USING (EXISTS (SELECT 1 FROM public.kyc_submissions s WHERE s.id = submission_id AND s.user_id = auth.uid()));
CREATE POLICY "HR/Admin can view all reviews" ON public.kyc_document_reviews FOR SELECT USING ((SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin'));
CREATE POLICY "HR/Admin can insert reviews" ON public.kyc_document_reviews FOR INSERT WITH CHECK ((SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin'));

-- Storage Policies Overhaul
DROP POLICY IF EXISTS "Employees can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Employees can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Employees can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "HR and Admins can read all employee documents" ON storage.objects;

-- We only allow direct uploads if user_id matches path
CREATE POLICY "Employees can upload to their own folder"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'employee-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Employees can read their own files"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'employee-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "HR and Admins can read all employee documents"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'employee-documents' 
        AND (SELECT role::text FROM public.user_profiles WHERE id = auth.uid()) IN ('hr_manager', 'admin', 'super_admin')
    );
