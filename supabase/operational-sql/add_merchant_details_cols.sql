-- Add missing detail columns to merchants table
ALTER TABLE public.merchants 
ADD COLUMN IF NOT EXISTS owner_name TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT;

COMMENT ON COLUMN public.merchants.owner_name IS 'Name of the business owner';
COMMENT ON COLUMN public.merchants.business_address IS 'Registered business address';
