-- Fix missing columns for ai_orders_vault_transactions that were skipped by IF NOT EXISTS
ALTER TABLE public.ai_orders_vault_transactions
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
