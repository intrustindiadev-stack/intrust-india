-- Migration: Remove deal_value from CRM Leads and Services

ALTER TABLE public.crm_leads 
DROP COLUMN IF EXISTS deal_value;

ALTER TABLE public.crm_lead_services 
DROP COLUMN IF EXISTS deal_value;
