-- Migration to enforce uniqueness on kyc_records.user_id

-- 1. Keep only the latest record per user and delete duplicates
WITH RankedRecords AS (
    SELECT id,
           ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) as rk
    FROM kyc_records
)
DELETE FROM kyc_records
WHERE id IN (SELECT id FROM RankedRecords WHERE rk > 1);

-- 2. Add unique constraint to user_id
ALTER TABLE kyc_records ADD CONSTRAINT kyc_records_user_id_unique UNIQUE (user_id);
