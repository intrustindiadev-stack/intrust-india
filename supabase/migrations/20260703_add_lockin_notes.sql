-- 20260703_add_lockin_notes.sql
-- Add notes column to merchant_lockin_balances to store user-provided descriptions/notes.

ALTER TABLE public.merchant_lockin_balances
    ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.merchant_lockin_balances.notes IS
    'Optional user-provided note or description for this lockin investment.';
