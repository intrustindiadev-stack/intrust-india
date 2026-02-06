-- SQL Script to Make Your User an Admin
-- Run this in Supabase SQL Editor

-- STEP 1: Find your user ID (check who you're logged in as)
SELECT id, email, role FROM auth.users LIMIT 10;

-- STEP 2: Update your user's role to admin
-- Replace 'your-email@example.com' with your actual email
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'your-email@example.com'
);

-- STEP 3: Verify the change
SELECT 
    u.email,
    up.role,
    up.is_suspended
FROM auth.users u
JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'your-email@example.com';

-- Expected result: role should be 'admin'
