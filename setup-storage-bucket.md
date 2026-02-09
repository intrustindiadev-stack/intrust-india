-- Create Supabase Storage Bucket for Gift Card Images
-- This is a MANUAL STEP - do this in Supabase Dashboard, not SQL Editor

## Steps to Create Storage Bucket:

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Click on "Storage" in the left sidebar
3. Click "Create a new bucket" button
4. Set the following:
   - Name: gift-cards
   - Public bucket: YES (check the box)
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif

5. Click "Create bucket"

6. After creating, click on the "gift-cards" bucket
7. Click on "Policies" tab
8. Enable "Public access" by creating these policies:

### Policy 1: Allow Public Read
- Name: Public read access
- Operation: SELECT
- Policy definition: `(bucket_id = 'gift-cards'::text)`

### Policy 2: Allow Authenticated Upload
- Name: Authenticated users can upload
- Operation: INSERT
- Target roles: authenticated
- Policy definition: `(bucket_id = 'gift-cards'::text)`

### Policy 3: Allow Service Role All Access
- Name: Service role full access
- Operation: ALL
- Target roles: service_role
- Policy definition: `(bucket_id = 'gift-cards'::text)`

That's it! The bucket is ready for use.
