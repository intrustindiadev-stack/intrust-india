-- Migration: De-duplicate existing KYC records per user and enforce uniqueness

-- Step 1: De-duplicate existing kyc_records per user. 
-- We keep the most recently updated record for each user.
WITH duplicates AS (
    SELECT id, user_id, 
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) as rnum
    FROM kyc_records
)
DELETE FROM kyc_records
WHERE id IN (
    SELECT id FROM duplicates WHERE rnum > 1
);

-- Step 2: Add unique constraint on user_id to prevent future duplicates
ALTER TABLE kyc_records ADD CONSTRAINT kyc_records_user_id_key UNIQUE (user_id);
