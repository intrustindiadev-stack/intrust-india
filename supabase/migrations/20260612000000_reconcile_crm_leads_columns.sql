-- Reconcile production schema drift on crm_leads table
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS deal_value NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'warm' CHECK (temperature IN ('hot', 'warm', 'cold')),
ADD COLUMN IF NOT EXISTS next_followup_date TIMESTAMP WITH TIME ZONE;
