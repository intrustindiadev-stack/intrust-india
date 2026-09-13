-- Migration: Add department column to merchants table with index and backfill
-- Timestamp: 2026-09-12

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'merchants'
          AND column_name = 'department'
    ) THEN
        ALTER TABLE public.merchants 
        ADD COLUMN department VARCHAR(50) DEFAULT 'general' NOT NULL;
    END IF;
END $$;

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_merchants_department ON public.merchants(department);

-- Dynamic Backfill of existing merchants based on keywords in business_name
UPDATE public.merchants
SET department = 'grocery'
WHERE department = 'general'
  AND (
    business_name ILIKE '%mart%' OR 
    business_name ILIKE '%kirana%' OR 
    business_name ILIKE '%provision%' OR 
    business_name ILIKE '%supermarket%' OR 
    business_name ILIKE '%grocery%' OR 
    business_name ILIKE '%store%'
  );

UPDATE public.merchants
SET department = 'electronics'
WHERE department = 'general'
  AND (
    business_name ILIKE '%tech%' OR 
    business_name ILIKE '%mobile%' OR 
    business_name ILIKE '%electronic%' OR 
    business_name ILIKE '%gadget%' OR 
    business_name ILIKE '%cellular%' OR 
    business_name ILIKE '%computer%'
  );

UPDATE public.merchants
SET department = 'fashion'
WHERE department = 'general'
  AND (
    business_name ILIKE '%fashion%' OR 
    business_name ILIKE '%wear%' OR 
    business_name ILIKE '%cloth%' OR 
    business_name ILIKE '%apparel%' OR 
    business_name ILIKE '%style%' OR 
    business_name ILIKE '%garment%'
  );

UPDATE public.merchants
SET department = 'pharmacy'
WHERE department = 'general'
  AND (
    business_name ILIKE '%pharma%' OR 
    business_name ILIKE '%med%' OR 
    business_name ILIKE '%chemist%' OR 
    business_name ILIKE '%drug%' OR 
    business_name ILIKE '%health%'
  );

UPDATE public.merchants
SET department = 'bakery'
WHERE department = 'general'
  AND (
    business_name ILIKE '%bake%' OR 
    business_name ILIKE '%cake%' OR 
    business_name ILIKE '%bread%' OR 
    business_name ILIKE '%sweet%'
  );
