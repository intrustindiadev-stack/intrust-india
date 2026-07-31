-- Create ENUMs
CREATE TYPE public.incentive_status AS ENUM ('Pending', 'Approved', 'Paid');
CREATE TYPE public.incentive_type AS ENUM ('Performance Bonus', 'Referral', 'Festival Bonus', 'Other');

-- Create incentives table
CREATE TABLE public.incentives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type public.incentive_type NOT NULL,
    description TEXT,
    date_awarded TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    status public.incentive_status DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.incentives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.incentives TO service_role;

-- RLS Policies
-- HR Managers and Admins can do everything
CREATE POLICY "Enable all actions for hr_manager and admin" ON public.incentives
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'hr_manager')
    )
);

-- Employees can view their own incentives
CREATE POLICY "Enable read access for own incentives" ON public.incentives
FOR SELECT USING (
    employee_id = auth.uid()
);

-- Set up trigger to update updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.incentives
    FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');
