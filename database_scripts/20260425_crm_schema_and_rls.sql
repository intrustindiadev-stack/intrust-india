-- ==========================================
-- CRM Schema (Sales)
-- ==========================================

-- Lead Status ENUM
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost');

-- Leads Table
CREATE TABLE public.crm_leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source TEXT,
    status lead_status DEFAULT 'new' NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    notes TEXT,
    pipeline_stage TEXT DEFAULT 'new' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Notes Table
CREATE TABLE public.crm_lead_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Activities Table
CREATE TABLE public.crm_lead_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_activities ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- CRM RLS Policies
-- ==========================================

-- CRM Leads Policies
CREATE POLICY "Sales can view their own leads, Managers/Admins can view all"
    ON public.crm_leads FOR SELECT
    USING (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
    );

CREATE POLICY "Sales can insert leads"
    ON public.crm_leads FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_exec', 'sales_manager', 'admin', 'super_admin')
    );

CREATE POLICY "Sales can update their own leads, Managers/Admins can update all"
    ON public.crm_leads FOR UPDATE
    USING (
        auth.uid() = assigned_to OR 
        auth.uid() = created_by OR
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
    );

-- CRM Lead Notes Policies
CREATE POLICY "Sales can view notes on their leads, Managers/Admins can view all"
    ON public.crm_lead_notes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads l 
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR 
                l.created_by = auth.uid() OR 
                (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
            )
        )
    );

CREATE POLICY "Sales can add notes to their leads"
    ON public.crm_lead_notes FOR INSERT
    WITH CHECK (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM public.crm_leads l 
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR 
                l.created_by = auth.uid() OR 
                (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
            )
        )
    );

-- CRM Lead Activities Policies
CREATE POLICY "Sales can view activities on their leads, Managers/Admins can view all"
    ON public.crm_lead_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crm_leads l 
            WHERE l.id = lead_id AND (
                l.assigned_to = auth.uid() OR 
                l.created_by = auth.uid() OR 
                (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_manager', 'admin', 'super_admin')
            )
        )
    );

CREATE POLICY "System/Sales can insert activities"
    ON public.crm_lead_activities FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('sales_exec', 'sales_manager', 'admin', 'super_admin')
    );
