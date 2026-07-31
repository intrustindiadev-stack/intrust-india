-- Drop the incorrect foreign key constraint
ALTER TABLE public.incentives DROP CONSTRAINT IF EXISTS incentives_employee_id_fkey;

-- Add the correct foreign key constraint to user_profiles
ALTER TABLE public.incentives ADD CONSTRAINT incentives_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
