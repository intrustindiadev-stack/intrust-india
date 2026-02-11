-- KYC Records Table Schema Migration
-- Purpose: Add missing columns to existing kyc_records table for merchant KYC verification
-- Author: Antigravity AI
-- Date: 2026-02-12

-- =====================================================
-- STEP 1: Add new columns to kyc_records table
-- =====================================================

-- Add phone_number column
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add pan_number column (Indian PAN format: ABCDE1234F)
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS pan_number TEXT;

-- Add full_address column
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS full_address TEXT;

-- Add bank_grade_security flag
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS bank_grade_security BOOLEAN DEFAULT false;

-- Add verification_status enum column (separate from existing 'status' column)
-- Note: Keeping existing 'status' column for backward compatibility
DO $$ BEGIN
  CREATE TYPE verification_status_enum AS ENUM ('pending', 'verified', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS verification_status verification_status_enum DEFAULT 'pending';

-- Add admin approval tracking
ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

ALTER TABLE kyc_records
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- STEP 2: Add indexes for performance
-- =====================================================

-- Index on user_id for fast user lookups
CREATE INDEX IF NOT EXISTS idx_kyc_records_user_id 
ON kyc_records(user_id);

-- Index on verification_status for admin panel filtering
CREATE INDEX IF NOT EXISTS idx_kyc_records_verification_status 
ON kyc_records(verification_status);

-- Index on verified_by for admin audit trails
CREATE INDEX IF NOT EXISTS idx_kyc_records_verified_by 
ON kyc_records(verified_by);

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_kyc_records_user_status 
ON kyc_records(user_id, verification_status);

-- =====================================================
-- STEP 3: Add constraints for data integrity
-- =====================================================

-- Ensure PAN number follows Indian format (5 letters + 4 digits + 1 letter)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_pan_format') THEN
        ALTER TABLE kyc_records
        ADD CONSTRAINT check_pan_format 
        CHECK (pan_number IS NULL OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$');
    END IF;
END $$;

-- Ensure phone number is 10 digits
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_phone_format') THEN
        ALTER TABLE kyc_records
        ADD CONSTRAINT check_phone_format 
        CHECK (phone_number IS NULL OR phone_number ~ '^[0-9]{10}$');
    END IF;
END $$;

-- Ensure verified_at is only set when verification_status is verified/rejected
-- (This is enforced at application level, but good to document)

-- =====================================================
-- STEP 4: Update existing records (if any)
-- =====================================================

-- Set verification_status to 'pending' for existing records that don't have it
UPDATE kyc_records
SET verification_status = 'pending'
WHERE verification_status IS NULL;

-- =====================================================
-- STEP 5: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN kyc_records.phone_number IS 'User phone number (10 digits, Indian format)';
COMMENT ON COLUMN kyc_records.pan_number IS 'PAN card number (format: ABCDE1234F)';
COMMENT ON COLUMN kyc_records.full_address IS 'Complete address of the user';
COMMENT ON COLUMN kyc_records.bank_grade_security IS 'User opted for bank-grade security';
COMMENT ON COLUMN kyc_records.verification_status IS 'KYC verification status: pending, verified, or rejected';
COMMENT ON COLUMN kyc_records.verified_by IS 'Admin user ID who approved/rejected the KYC';
COMMENT ON COLUMN kyc_records.verified_at IS 'Timestamp when KYC was approved/rejected';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'kyc_records'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'kyc_records';

-- Check constraints
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'kyc_records';
