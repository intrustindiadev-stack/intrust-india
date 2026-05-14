-- Fix KYC Records RLS Policies for Admin Access
-- Purpose: Update RLS policies to check user_profiles.role = 'admin' instead of looking up app_admins table

-- Drop existing admin policies that use app_admins
DROP POLICY IF EXISTS "Admins can view all KYC" ON kyc_records;
DROP POLICY IF EXISTS "Admins can update any KYC" ON kyc_records;

-- Re-create policies using user_profiles role check

-- Policy: Admins can view all KYC records
CREATE POLICY "Admins can view all KYC"
ON kyc_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  )
);

-- Policy: Admins can update any KYC record
CREATE POLICY "Admins can update any KYC"
ON kyc_records
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
  )
);

-- Ensure authenticated users can still select/update their own (these usually don't need changing if they were correct)
-- But ensuring update policy allows admins to update ANY status
