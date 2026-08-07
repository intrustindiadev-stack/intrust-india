-- Add selfie_url column to attendance table
ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- Create attendance-selfies bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-selfies', 'attendance-selfies', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket RLS Policies for attendance-selfies
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'attendance-selfies' );

CREATE POLICY "Authenticated users can upload selfies" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'attendance-selfies' 
    AND auth.role() = 'authenticated'
);
