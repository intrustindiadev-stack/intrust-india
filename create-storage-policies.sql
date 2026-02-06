-- Storage Policies for gift-cards bucket
-- Run these in Supabase Dashboard → Storage → gift-cards bucket → Policies tab

-- ==================================================
-- OPTION 1: SIMPLE - Allow ALL operations (Recommended for testing)
-- ==================================================

-- 1. Click "New Policy" button
-- 2. Choose "For full customization" at the bottom
-- 3. Use these settings:

Policy Name: Allow all operations
Allowed operations: SELECT, INSERT, UPDATE, DELETE (check all boxes)
Policy definition: true
Target roles: public, authenticated, service_role


-- ==================================================
-- OPTION 2: SQL - Run in SQL Editor (Alternative)
-- ==================================================

-- Enable public access for reading (viewing images)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'gift-cards');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gift-cards' AND auth.role() = 'authenticated');

-- Allow service role (admin) full access
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
USING (bucket_id = 'gift-cards' AND auth.role() = 'service_role');


-- ==================================================
-- TO VERIFY POLICIES ARE WORKING:
-- ==================================================
-- Go to Storage → gift-cards bucket → Policies tab
-- You should see 3 policies listed (or 1 if using Option 1)
