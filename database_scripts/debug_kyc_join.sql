-- Debug script to check KYC records join issue
-- Run this in Supabase SQL Editor to diagnose why KYC records aren't showing

-- 1. Check if foreign key exists
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'kyc_records'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 2. Check if user_id in kyc_records matches any user in user_profiles
SELECT 
    kr.id as kyc_id,
    kr.user_id,
    kr.full_legal_name,
    kr.status,
    up.id as profile_id,
    up.full_name,
    CASE 
        WHEN up.id IS NULL THEN 'NO MATCH - user_id not found in user_profiles'
        ELSE 'MATCH FOUND'
    END as match_status
FROM kyc_records kr
LEFT JOIN user_profiles up ON up.id = kr.user_id
ORDER BY kr.created_at DESC;

-- 3. If there's no foreign key, create one (UNCOMMENT TO RUN)
-- ALTER TABLE kyc_records
-- ADD CONSTRAINT kyc_records_user_id_fkey
-- FOREIGN KEY (user_id)
-- REFERENCES user_profiles(id)
-- ON DELETE CASCADE;

-- 4. Check RLS policies on kyc_records
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'kyc_records';

-- 5. Test the join query directly
SELECT 
    up.id,
    up.full_name,
    up.email,
    kr.id as kyc_id,
    kr.full_legal_name,
    kr.status
FROM user_profiles up
LEFT JOIN kyc_records kr ON kr.user_id = up.id
WHERE up.full_name = 'Ayush Malviya'
LIMIT 1;
