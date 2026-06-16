-- 20260621000000_drop_selection_tokens_and_reconcile.sql

-- Drop selection_tokens table
DROP TABLE IF EXISTS public.selection_tokens;

-- Drop resolve_identities_by_phone function
DROP FUNCTION IF EXISTS public.resolve_identities_by_phone(text);
