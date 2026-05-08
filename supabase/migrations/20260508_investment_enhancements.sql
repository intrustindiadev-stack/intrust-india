-- ============================================================
-- Investment System Enhancements + Grants Fix
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add new columns (safe - IF NOT EXISTS)
ALTER TABLE merchant_investments
  ADD COLUMN IF NOT EXISTS interest_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 12.0,
  ADD COLUMN IF NOT EXISTS duration_days INT NOT NULL DEFAULT 365,
  ADD COLUMN IF NOT EXISTS maturity_date TIMESTAMP WITH TIME ZONE;

-- Update existing rows maturity_date
UPDATE merchant_investments
  SET maturity_date = approved_at + INTERVAL '365 days'
  WHERE maturity_date IS NULL AND approved_at IS NOT NULL;

-- Add location and category to investment orders
ALTER TABLE merchant_investment_orders
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';

-- ============================================================
-- CRITICAL: Grant table access to Supabase roles
-- Without these, service_role gets "permission denied"
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_investments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_investments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_investment_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON merchant_investment_orders TO service_role;
