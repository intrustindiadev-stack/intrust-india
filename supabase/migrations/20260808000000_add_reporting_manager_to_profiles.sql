ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS reporting_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_reporting_manager_id ON public.user_profiles(reporting_manager_id);
