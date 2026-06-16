-- Step 2.1 — Extend audit_action enum with session mint actions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'session_mint_success'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'session_mint_success';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'session_mint_failed'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'session_mint_failed';
  END IF;
END;
$$;
