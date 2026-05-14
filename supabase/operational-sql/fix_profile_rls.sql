-- Enable RLS just in case
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profile
-- IF NOT EXISTS is not standard SQL for policies in all versions, so we drop first to be safe or use a DO block
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" 
        ON public.user_profiles 
        FOR SELECT 
        USING ( auth.uid() = id );
    END IF;
END $$;
