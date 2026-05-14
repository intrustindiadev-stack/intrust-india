-- Clean up duplicate RLS policies on kyc_records table
-- Purpose: Remove old/redundant policies to ensure only the new specific policies are active
-- Author: Antigravity AI
-- Date: 2026-02-12

-- Drop old policies that conflict with or duplicate the new ones
-- "user_can_view_own_kyc" is replaced by "Users can view own KYC"
DROP POLICY IF EXISTS "user_can_view_own_kyc" ON kyc_records;

-- "user_can_insert_kyc" is replaced by "Users can create own KYC"
DROP POLICY IF EXISTS "user_can_insert_kyc" ON kyc_records;

-- "user_can_update_pending_kyc" is replaced by "Users can update own pending KYC"
DROP POLICY IF EXISTS "user_can_update_pending_kyc" ON kyc_records;

-- Verify that only the correct policies remain
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'kyc_records';
