-- KYC Records Row Level Security (RLS) Policies
-- Purpose: Secure access to KYC records - users can only access their own, admins can access all
-- Author: Antigravity AI
-- Date: 2026-02-12

-- =====================================================
-- STEP 1: Enable RLS on kyc_records table
-- =====================================================

ALTER TABLE kyc_records ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Drop existing policies (if any) to avoid conflicts
-- =====================================================

DROP POLICY IF EXISTS "Users can view own KYC" ON kyc_records;
DROP POLICY IF EXISTS "Users can create own KYC" ON kyc_records;
DROP POLICY IF EXISTS "Users can update own pending KYC" ON kyc_records;
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc_records;
DROP POLICY IF EXISTS "Admins can update any KYC" ON kyc_records;

-- =====================================================
-- STEP 3: Create user policies
-- =====================================================

-- Policy: Users can view their own KYC records
CREATE POLICY "Users can view own KYC"
ON kyc_records
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own KYC records
CREATE POLICY "Users can create own KYC"
ON kyc_records
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update ONLY their own PENDING KYC records
-- Once verified or rejected, users cannot modify the record
CREATE POLICY "Users can update own pending KYC"
ON kyc_records
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND verification_status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id 
  AND verification_status = 'pending'
);

-- =====================================================
-- STEP 4: Create admin policies
-- =====================================================

-- Policy: Admins can view all KYC records
CREATE POLICY "Admins can view all KYC"
ON kyc_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

-- Policy: Admins can update any KYC record (for approval/rejection)
CREATE POLICY "Admins can update any KYC"
ON kyc_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM app_admins
    WHERE app_admins.user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 5: Grant necessary permissions
-- =====================================================

-- Grant authenticated users access to the table
GRANT SELECT, INSERT, UPDATE ON kyc_records TO authenticated;

-- Note: DELETE is intentionally not granted - KYC records should never be deleted
-- for audit and compliance purposes

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'kyc_records';

-- List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'kyc_records';

-- =====================================================
-- TESTING NOTES
-- =====================================================

-- Test as regular user:
-- 1. Login as User A
-- 2. Try to SELECT from kyc_records → should only see own records
-- 3. Try to INSERT with user_id = User A → should work
-- 4. Try to INSERT with user_id = User B → should fail
-- 5. Try to UPDATE own pending record → should work
-- 6. Try to UPDATE own verified record → should fail

-- Test as admin:
-- 1. Login as Admin user (must exist in app_admins table)
-- 2. Try to SELECT from kyc_records → should see all records
-- 3. Try to UPDATE any record → should work
-- 4. Can approve/reject by updating verification_status, verified_by, verified_at

-- =====================================================
-- IMPORTANT: Admin Setup
-- =====================================================

-- Before testing admin policies, ensure you have at least one admin user:
-- INSERT INTO app_admins (user_id) VALUES ('YOUR_ADMIN_USER_UUID');

-- To make yourself an admin (replace with your user ID):
-- INSERT INTO app_admins (user_id) 
-- SELECT auth.uid() 
-- WHERE NOT EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid());
