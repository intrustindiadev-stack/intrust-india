-- Step 1 — Database Migration: Add Commission Columns to shopping_order_groups

ALTER TABLE public.shopping_order_groups 
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(4,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS platform_cut_paise BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS merchant_profit_paise BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admin_takeover_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending';

-- Add CHECK constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shopping_order_groups_settlement_status_check'
  ) THEN
    ALTER TABLE public.shopping_order_groups 
    ADD CONSTRAINT shopping_order_groups_settlement_status_check 
    CHECK (settlement_status IN ('pending', 'settled', 'admin_takeover'));
  END IF;
END $$;

-- Add index for the cron query
CREATE INDEX IF NOT EXISTS idx_order_groups_settlement ON public.shopping_order_groups(settlement_status, created_at);
