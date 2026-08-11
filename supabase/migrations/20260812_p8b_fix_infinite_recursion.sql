BEGIN;

-- 1. Create a SECURITY DEFINER function to check roles without triggering RLS
CREATE OR REPLACE FUNCTION public.has_role(p_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role::text = ANY(p_roles)
  );
END;
$$;

-- 2. Fix infinite recursion in user_profiles policies
DROP POLICY IF EXISTS "HR managers can update all profiles" ON public.user_profiles;
CREATE POLICY "HR managers can update all profiles"
ON public.user_profiles FOR UPDATE
USING (
  has_role(ARRAY['hr_manager', 'admin', 'super_admin'])
);

DROP POLICY IF EXISTS "HR managers can view all profiles" ON public.user_profiles;
CREATE POLICY "HR managers can view all profiles"
ON public.user_profiles FOR SELECT
USING (
  auth.uid() = id OR 
  has_role(ARRAY['hr_manager', 'admin', 'super_admin'])
);

-- 3. Fix P8 storage policies to use has_role() instead of direct table queries
-- Payslips
DROP POLICY IF EXISTS "Payslips can be uploaded by HR" ON storage.objects;
CREATE POLICY "Payslips can be uploaded by HR"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payslips' AND
  has_role(ARRAY['hr_manager', 'admin', 'super_admin'])
);

-- Product Images
DROP POLICY IF EXISTS "Admin can upload product images" ON storage.objects;
CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  has_role(ARRAY['admin', 'super_admin'])
);

-- Banners
DROP POLICY IF EXISTS "Admin Uploads for Banners" ON storage.objects;
CREATE POLICY "Admin Uploads for Banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners' AND
  has_role(ARRAY['admin', 'super_admin'])
);

-- Gift Cards
DROP POLICY IF EXISTS "Admins can manage gift cards" ON storage.objects;
CREATE POLICY "Admins can manage gift cards"
ON storage.objects FOR ALL
USING (
  bucket_id = 'gift-cards' AND
  has_role(ARRAY['admin', 'super_admin'])
)
WITH CHECK (
  bucket_id = 'gift-cards' AND
  has_role(ARRAY['admin', 'super_admin'])
);

COMMIT;
