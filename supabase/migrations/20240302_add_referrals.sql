-- 1. Add new columns to user_profiles table (Safe to run multiple times)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS completed_onboarding BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS services TEXT[];
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_source TEXT;

-- 2. Create index on referral_code for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles (referral_code);

-- 3. Replace the existing handle_new_user function to auto-generate a 6-char referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  name_val text;
  avatar_val text;
  new_code text;
  code_exists boolean;
BEGIN
  -- Extract name and avatar from metadata
  name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User');
  avatar_val := NEW.raw_user_meta_data->>'avatar_url';

  -- Loop until we find a unique referral_code
  LOOP
    -- Generate a 6 character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if it already exists
    SELECT EXISTS (
      SELECT 1 FROM public.user_profiles WHERE referral_code = new_code
    ) INTO code_exists;
    
    -- Exit loop if unique
    EXIT WHEN NOT code_exists;
  END LOOP;

  -- Insert the profile with the generated code
  INSERT INTO public.user_profiles (id, phone, full_name, avatar_url, role, referral_code)
  VALUES (
    NEW.id, 
    NEW.phone, 
    name_val,
    avatar_val,
    'user',
    new_code
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (The trigger itself 'on_auth_user_created' already exists and calls this function, so replacing the function is enough)

-- 4. Update existing profiles that don't have a referral code
DO $$
DECLARE
  r RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR r IN SELECT id FROM public.user_profiles WHERE referral_code IS NULL LOOP
    -- Loop until we find a unique referral_code
    LOOP
      new_code := upper(substring(md5(random()::text) from 1 for 6));
      SELECT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE referral_code = new_code
      ) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;

    -- Update the record
    UPDATE public.user_profiles SET referral_code = new_code WHERE id = r.id;
  END LOOP;
END;
$$;
