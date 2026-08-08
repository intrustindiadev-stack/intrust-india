-- Migration: Enhance CRM Leads for Bulk Import and Idempotency
-- Description: Adds tracking columns to crm_leads and strengthens team_service_areas constraints.

-- 1. Add tracking columns to crm_leads
ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS source_system VARCHAR(50),
    ADD COLUMN IF NOT EXISTS external_lead_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS import_batch_id UUID;

-- Add indexes for lookups
CREATE INDEX IF NOT EXISTS idx_crm_leads_external_id ON public.crm_leads (source_system, external_lead_id) WHERE external_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_import_batch ON public.crm_leads (import_batch_id) WHERE import_batch_id IS NOT NULL;

-- 2. Strengthen constraints on team_service_areas
-- Prevent purely numeric values for 'city' or 'state' area types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_service_areas_city_state_format') THEN
        ALTER TABLE public.team_service_areas
            ADD CONSTRAINT team_service_areas_city_state_format
            CHECK (
                area_type NOT IN ('city', 'state') 
                OR value !~ '^[0-9]+$'
            );
    END IF;
END $$;
