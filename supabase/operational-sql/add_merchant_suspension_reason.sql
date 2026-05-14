-- Add suspension_reason column to merchants table if it doesn't already exist.
-- The suspended page (app/(merchant)/merchant/suspended/page.jsx) already reads
-- this column, so it may already be present. This script is defensive.
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
