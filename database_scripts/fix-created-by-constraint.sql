-- Fix the created_by foreign key constraint issue
-- Run this in Supabase SQL Editor

-- OPTION 1: Make created_by nullable (allows NULL values)
ALTER TABLE public.coupons 
ALTER COLUMN created_by DROP NOT NULL;

-- OPTION 2: Drop the foreign key constraint entirely
ALTER TABLE public.coupons 
DROP CONSTRAINT IF EXISTS coupons_created_by_fkey;

-- OPTION 3: Verify your user ID exists in user_profiles
SELECT id, email, role 
FROM public.user_profiles 
WHERE id = '032ffa52-25e5-4849-85a0-00d27e043fbc';

-- If the above returns no rows, run this to create the profile:
INSERT INTO public.user_profiles (id, full_name, role)
VALUES (
    '032ffa52-25e5-4849-85a0-00d27e043fbc',
    'Admin User',
    'admin'
)
ON CONFLICT (id) DO NOTHING;
