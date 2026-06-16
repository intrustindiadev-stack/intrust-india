-- Step 2.2 — Extend audit_action enum with otp_send_failed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.audit_action'::regtype
      AND enumlabel = 'otp_send_failed'
  ) THEN
    ALTER TYPE public.audit_action ADD VALUE 'otp_send_failed';
  END IF;
END;
$$;
