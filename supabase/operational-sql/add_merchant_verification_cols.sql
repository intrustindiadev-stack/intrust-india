-- Add verification columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS gstin_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS bank_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gstin_data JSONB,
ADD COLUMN IF NOT EXISTS bank_data JSONB;

-- Comment on columns
COMMENT ON COLUMN public.merchants.gstin_verified IS 'Whether GSTIN has been verified via SprintVerify';
COMMENT ON COLUMN public.merchants.bank_verified IS 'Whether Bank Account has been verified via SprintVerify';
COMMENT ON COLUMN public.merchants.gstin_data IS 'Raw GSTIN verification data from SprintVerify';
COMMENT ON COLUMN public.merchants.bank_data IS 'Raw Bank verification data from SprintVerify';

-- Add PAN verification columns (required by app/api/merchant/apply/route.js)
-- IMPORTANT: Run this migration BEFORE deploying the updated route.js to production.
ALTER TABLE public.merchants
    ADD COLUMN IF NOT EXISTS pan_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pan_data     JSONB    DEFAULT NULL;

COMMENT ON COLUMN public.merchants.pan_verified IS 'Whether PAN has been verified via SprintVerify';
COMMENT ON COLUMN public.merchants.pan_data IS 'Raw PAN verification data from SprintVerify';
