-- Drop the overly permissive SELECT policy on the resumes bucket
DROP POLICY IF EXISTS "Authenticated users can view resumes" ON storage.objects;
