-- Geolocation and Geofencing support for Attendance

ALTER TABLE public.attendance
ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC,
ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC,
ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC,
ADD COLUMN IF NOT EXISTS is_onsite BOOLEAN DEFAULT false;

-- Re-grant access for public.attendance just in case
GRANT ALL ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
