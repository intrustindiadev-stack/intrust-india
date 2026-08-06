-- Enable the pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes on the frequently searched columns of crm_leads
-- Using gin_trgm_ops for fast ILIKE and fuzzy searching
CREATE INDEX IF NOT EXISTS crm_leads_contact_name_trgm_idx ON crm_leads USING GIN (contact_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS crm_leads_email_trgm_idx ON crm_leads USING GIN (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS crm_leads_phone_trgm_idx ON crm_leads USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS crm_leads_title_trgm_idx ON crm_leads USING GIN (title gin_trgm_ops);
