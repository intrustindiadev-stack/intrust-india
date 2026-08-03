-- Migration: Solar Leads Schema (Safe for fresh and existing environments)

-- 1. Create table if not exists (we use IF NOT EXISTS to prevent failing if table is present)
CREATE TABLE IF NOT EXISTS public.solar_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reference_code VARCHAR(20) UNIQUE NOT NULL DEFAULT 'SL-' || upper(substr(md5(random()::text), 1, 8)),
    
    -- Contact details
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    email VARCHAR(255),
    
    -- Property & Location
    pincode VARCHAR(10) NOT NULL,
    city VARCHAR(255),
    address TEXT,
    property_type VARCHAR(50) NOT NULL DEFAULT 'residential',
    
    -- Estimation inputs
    monthly_bill_range VARCHAR(50) NOT NULL,
    
    -- Workflow & Tracking
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    source VARCHAR(50) NOT NULL DEFAULT 'website',
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    
    -- Appointments & Consent
    consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    marketing_consent BOOLEAN DEFAULT false,
    next_follow_up_at TIMESTAMPTZ,
    survey_scheduled_at TIMESTAMPTZ,
    
    -- Notes & Auditing
    customer_message TEXT,
    internal_notes TEXT,
    lost_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Concurrency
    version INTEGER NOT NULL DEFAULT 1
);

-- 2. Add columns if table existed but missed some columns (using DO block for safety)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN reference_code VARCHAR(20) UNIQUE DEFAULT 'SL-' || upper(substr(md5(random()::text), 1, 8));
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN source VARCHAR(50) DEFAULT 'website';
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN priority VARCHAR(20) DEFAULT 'medium';
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN consent_timestamp TIMESTAMPTZ DEFAULT now();
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN marketing_consent BOOLEAN DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN next_follow_up_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN survey_scheduled_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN customer_message TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN internal_notes TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN lost_reason TEXT;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN status_updated_at TIMESTAMPTZ DEFAULT now();
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN version INTEGER DEFAULT 1;
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE public.solar_leads ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    EXCEPTION WHEN duplicate_column THEN END;
END $$;

-- 3. Create canonical status constraint
DO $$
BEGIN
    ALTER TABLE public.solar_leads DROP CONSTRAINT IF EXISTS solar_leads_status_check;
    ALTER TABLE public.solar_leads ADD CONSTRAINT solar_leads_status_check 
        CHECK (status IN ('new', 'contacted', 'qualified', 'site_visit', 'quoted', 'converted', 'lost', 'cancelled'));
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Failed to add status constraint, perhaps data violates it';
END $$;

-- 4. Enforce duplicate prevention (only one active lead per user)
-- First, drop if exists, then create the partial unique index.
DROP INDEX IF EXISTS idx_solar_leads_unique_active_per_user;
CREATE UNIQUE INDEX idx_solar_leads_unique_active_per_user ON public.solar_leads (user_id) 
WHERE status NOT IN ('converted', 'lost', 'cancelled') AND user_id IS NOT NULL;

-- 5. Standard Indexes for performance
CREATE INDEX IF NOT EXISTS idx_solar_leads_status ON public.solar_leads(status);
CREATE INDEX IF NOT EXISTS idx_solar_leads_user_id ON public.solar_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_solar_leads_created_at ON public.solar_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solar_leads_assigned_to ON public.solar_leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_solar_leads_pincode ON public.solar_leads(pincode);
CREATE INDEX IF NOT EXISTS idx_solar_leads_next_follow_up ON public.solar_leads(next_follow_up_at);

-- 6. Trigger for updated_at and version bump
CREATE OR REPLACE FUNCTION update_solar_leads_mod_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status_updated_at = now();
    END IF;
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_solar_leads_updated_at ON public.solar_leads;
CREATE TRIGGER trg_solar_leads_updated_at
BEFORE UPDATE ON public.solar_leads
FOR EACH ROW
EXECUTE FUNCTION update_solar_leads_mod_time();

-- 7. Solar Lead Events (Audit Log)
CREATE TABLE IF NOT EXISTS public.solar_lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.solar_leads(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_solar_lead_events_lead_id ON public.solar_lead_events(lead_id);

-- 8. Row Level Security (RLS)
ALTER TABLE public.solar_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solar_lead_events ENABLE ROW LEVEL SECURITY;

-- Customers can view their own requests but only non-sensitive fields.
-- We handle column masking at the application/API layer, but here we restrict rows.
DROP POLICY IF EXISTS "Customers can view their own active leads" ON public.solar_leads;
CREATE POLICY "Customers can view their own active leads" 
ON public.solar_leads FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Wait, if users insert via the API (service role), we don't strictly need INSERT policy.
-- But if we want to allow direct insertion (not recommended as per prompt):
-- "Prefer server-controlled mutations rather than permissive direct client writes."
-- We will NOT add INSERT/UPDATE RLS for standard users. Everything goes through API.

-- Admin policies
DROP POLICY IF EXISTS "Admins can do everything on solar_leads" ON public.solar_leads;
CREATE POLICY "Admins can do everything on solar_leads"
ON public.solar_leads FOR ALL 
TO authenticated
USING (
    (auth.jwt()->>'role' IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Customers can view their own events" ON public.solar_lead_events;
CREATE POLICY "Customers can view their own events" 
ON public.solar_lead_events FOR SELECT 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.solar_leads WHERE id = solar_lead_events.lead_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view events" ON public.solar_lead_events;
CREATE POLICY "Admins can view events"
ON public.solar_lead_events FOR ALL 
TO authenticated
USING (
    (auth.jwt()->>'role' IN ('admin', 'super_admin'))
);
