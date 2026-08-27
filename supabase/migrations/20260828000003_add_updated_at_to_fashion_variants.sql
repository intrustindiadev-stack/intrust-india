-- Migration: Add updated_at column to fashion_variants
-- Ensures atomic customer_checkout_v4 stock decrement updates work without schema mismatch

ALTER TABLE public.fashion_variants 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
