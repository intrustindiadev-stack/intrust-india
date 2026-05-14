-- Storage RLS Policies for the `product-images` bucket
-- Run after creating the bucket in Supabase Dashboard → Storage

-- 1. Public read access (bucket is public, so this allows getPublicUrl to work)
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 2. Admin uploads into admin/ prefix
CREATE POLICY "Admin can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'admin'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

-- 3. Merchant uploads into merchant/<their_user_id>/ prefix
CREATE POLICY "Merchant can upload own product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'merchant'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'merchant'
    )
);

-- 4. Admin can delete any product image
CREATE POLICY "Admin can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

-- 5. Merchant can delete their own product images
CREATE POLICY "Merchant can delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'merchant'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'merchant'
    )
);
