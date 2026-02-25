-- Migration Script: Unify KYC Status
-- Task: Update all 'approved' KYC statuses to 'verified' for consistent handling across the application.

BEGIN;

-- 1. Update kyc_records table
UPDATE kyc_records 
SET status = 'verified' 
WHERE status = 'approved';

-- 2. Update user_profiles table (assuming the column is kyc_status based on frontend usage)
UPDATE user_profiles 
SET kyc_status = 'verified' 
WHERE kyc_status = 'approved';

-- Note: 'approved' is intentionally left alone for the `merchants` table and `admin_payout_requests` table 
-- as they represent application/account approval, not strictly KYC.

COMMIT;
