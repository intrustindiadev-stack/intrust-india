-- COMPREHENSIVE FIX for user_profiles access
-- Run this in Supabase SQL Editor

-- STEP 1: Check if your profile actually exists
-- Replace 'ytumvigorous@gmail.com' with your email from the debug page
SELECT 
    up.id,
    up.role,
    au.email
FROM public.user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE au.email = 'ytumvigorous@gmail.com';

-- If the above returns NO ROWS, your profile doesn't exist!
-- Create it with this (replace email):
INSERT INTO public.user_profiles (id, full_name, role)
SELECT 
    id,
    COALESCE(raw_user_meta_data->>'full_name', 'Admin User'),
    'admin'
FROM auth.users
WHERE email = 'ytumvigorous@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin';

-- STEP 2: Temporarily DISABLE RLS to test
-- (We'll re-enable it after confirming it works)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- STEP 3: Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_profiles';
-- Should show rowsecurity = false

-- After testing, if you want to re-enable RLS:
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
