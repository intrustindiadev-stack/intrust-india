-- Add blood_group column to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS blood_group TEXT
  CONSTRAINT chk_blood_group CHECK (
    blood_group IS NULL OR blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  );

COMMENT ON COLUMN public.user_profiles.blood_group IS 'Optional blood group for emergency identification. Set by the employee.';
