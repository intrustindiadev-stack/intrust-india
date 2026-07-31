-- Drop the failing policy if it exists (it probably didn't create, but just in case)
DO $$ BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Enable all actions for hr_manager and admin" ON public.incentives';
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Drop the failing trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.incentives;

-- Correct RLS Policy using user_profiles
CREATE POLICY "Enable all actions for hr_manager and admin" ON public.incentives
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'hr_manager')
    )
);
-- Wait, actually user_roles doesn't exist, we must use user_profiles! Let me correct the policy:

DROP POLICY IF EXISTS "Enable all actions for hr_manager and admin" ON public.incentives;

CREATE POLICY "Enable all actions for hr_manager and admin" ON public.incentives
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role IN ('admin', 'hr_manager')
    )
);

-- Instead of moddatetime, create our own simple trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.incentives
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
