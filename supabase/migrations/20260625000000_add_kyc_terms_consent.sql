-- Migration to add terms_accepted, terms_accepted_at, and terms_version to kyc_records
-- Idempotent script using IF NOT EXISTS

ALTER TABLE public.kyc_records
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS terms_version TEXT NULL;

COMMENT ON COLUMN public.kyc_records.terms_accepted IS 'Whether the user accepted the KYC Terms and Conditions';
COMMENT ON COLUMN public.kyc_records.terms_accepted_at IS 'Timestamp when the user accepted the terms';
COMMENT ON COLUMN public.kyc_records.terms_version IS 'Version identifier of the terms accepted';
