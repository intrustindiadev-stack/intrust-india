-- KYC Terms Acceptance: legal_documents CMS + customer_agreements vault
-- 1. legal_documents  2. customer_agreements  3. kyc_records cols  4. bucket

-- 1. legal_documents
CREATE TABLE IF NOT EXISTS public.legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    body_markdown TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT 'v1.0',
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT legal_documents_slug_check CHECK (slug IN ('terms','privacy','shipping','product','refund','kyc_terms'))
);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'legal_documents_slug_version_unique') THEN
        ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_slug_version_unique UNIQUE (slug, version);
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_documents_active_slug ON public.legal_documents (slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_legal_documents_slug_active ON public.legal_documents (slug, is_active);
CREATE OR REPLACE FUNCTION public.touch_legal_documents_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_touch_legal_documents ON public.legal_documents;
CREATE TRIGGER trg_touch_legal_documents BEFORE UPDATE ON public.legal_documents FOR EACH ROW EXECUTE FUNCTION public.touch_legal_documents_updated_at();
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active legal documents" ON public.legal_documents;
CREATE POLICY "Public can read active legal documents" ON public.legal_documents FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Admins can read all legal documents" ON public.legal_documents;
CREATE POLICY "Admins can read all legal documents" ON public.legal_documents FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins can insert legal documents" ON public.legal_documents;
CREATE POLICY "Admins can insert legal documents" ON public.legal_documents FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins can update legal documents" ON public.legal_documents;
CREATE POLICY "Admins can update legal documents" ON public.legal_documents FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT SELECT ON public.legal_documents TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON public.legal_documents TO authenticated, service_role;
-- 2. customer_agreements (audit vault)
CREATE TABLE IF NOT EXISTS public.customer_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kyc_record_id UUID NULL REFERENCES public.kyc_records(id) ON DELETE SET NULL,
    doc_slug TEXT NOT NULL DEFAULT 'kyc_terms',
    doc_version TEXT NOT NULL,
    doc_title TEXT NOT NULL DEFAULT 'KYC Terms & Conditions',
    full_text_snapshot TEXT NOT NULL DEFAULT '',
    pdf_storage_path TEXT NULL,
    pdf_hash_sha256 TEXT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_ip TEXT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_agreements_user ON public.customer_agreements (user_id);
CREATE INDEX IF NOT EXISTS idx_customer_agreements_kyc ON public.customer_agreements (kyc_record_id);
-- 3. kyc_records link columns
ALTER TABLE public.kyc_records
    ADD COLUMN IF NOT EXISTS agreement_id UUID NULL REFERENCES public.customer_agreements(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS agreement_pdf_path TEXT NULL,
    ADD COLUMN IF NOT EXISTS agreement_hash TEXT NULL,
    ADD COLUMN IF NOT EXISTS accepted_ip TEXT NULL;
-- 4. private storage bucket (lives on VPS disk via Docker volume)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer-agreements','customer-agreements', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf'];
DROP POLICY IF EXISTS "Users can read own agreement PDFs" ON storage.objects;
CREATE POLICY "Users can read own agreement PDFs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'customer-agreements' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()));
DROP POLICY IF EXISTS "Users can upload own agreement PDFs" ON storage.objects;
CREATE POLICY "Users can upload own agreement PDFs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'customer-agreements' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Admins can delete agreement PDFs" ON storage.objects;
CREATE POLICY "Admins can delete agreement PDFs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'customer-agreements' AND public.is_admin());
NOTIFY pgrst, 'reload schema';

ALTER TABLE public.customer_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own agreements" ON public.customer_agreements;
CREATE POLICY "Users can read own agreements" ON public.customer_agreements FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS "Users can insert own agreements" ON public.customer_agreements;
CREATE POLICY "Users can insert own agreements" ON public.customer_agreements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT ON public.customer_agreements TO authenticated, service_role;

