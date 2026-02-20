-- ============================================================
-- RESTORE ADMIN ACCESS
-- Use this script to promote your account to the 'admin' role
-- ============================================================

-- OPTION 1: Update by Email (Recommended for Google Logins)
UPDATE public.user_profiles
SET role = 'admin'
WHERE id IN (
    SELECT id FROM auth.users 
    WHERE email = 'your-email@gmail.com' -- <-- CHANGE THIS TO YOUR EMAIL
);

-- OPTION 2: Update by Phone
-- UPDATE public.user_profiles
-- SET role = 'admin'
-- WHERE phone = '+91XXXXXXXXXX'; -- <-- CHANGE THIS TO YOUR PHONE

-- ============================================================
-- VERIFICATION
-- ============================================================
-- SELECT id, full_name, email, role FROM public.user_profiles 
-- JOIN auth.users ON user_profiles.id = auth.users.id
-- WHERE role = 'admin';
