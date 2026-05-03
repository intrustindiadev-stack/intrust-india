-- Advanced CRM Schema Migration

-- 1. Add new columns to crm_leads for advanced tracking
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS deal_value NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'warm' CHECK (temperature IN ('hot', 'warm', 'cold')),
ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE;

-- 2. Create crm_tasks table for scheduling calls/meetings
CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    assigned_to UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for crm_tasks
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for crm_tasks (Assuming authenticated users can read/write their own or all tasks depending on role)
-- For simplicity, giving access to authenticated users based on standard CRM access
CREATE POLICY "Enable read access for authenticated users" ON public.crm_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.crm_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON public.crm_tasks FOR DELETE TO authenticated USING (true);

-- 3. Create crm_lead_services table for Sales Intent
CREATE TABLE IF NOT EXISTS public.crm_lead_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    service_name TEXT NOT NULL, -- e.g., 'Solar Power', 'NFC Smart Card', 'Online Store'
    status TEXT DEFAULT 'interested' CHECK (status IN ('interested', 'pitched', 'negotiating', 'won', 'lost')),
    deal_value NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for crm_lead_services
ALTER TABLE public.crm_lead_services ENABLE ROW LEVEL SECURITY;

-- Policies for crm_lead_services
CREATE POLICY "Enable read access for authenticated users" ON public.crm_lead_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert access for authenticated users" ON public.crm_lead_services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update access for authenticated users" ON public.crm_lead_services FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete access for authenticated users" ON public.crm_lead_services FOR DELETE TO authenticated USING (true);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_crm_tasks_updated_at ON public.crm_tasks;
CREATE TRIGGER update_crm_tasks_updated_at
    BEFORE UPDATE ON public.crm_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_lead_services_updated_at ON public.crm_lead_services;
CREATE TRIGGER update_crm_lead_services_updated_at
    BEFORE UPDATE ON public.crm_lead_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
