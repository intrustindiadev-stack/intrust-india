-- Purpose: Extend `whatsapp_message_logs.status` lifecycle constraint.
-- DEPLOY-BEFORE-CODE prerequisite — must ship before any code writing `sent`/`read`/`undeliverable` (ticket `1a768ed1…` and webhook ticket `7662a20e…`), else inserts/updates are rejected.
-- Live constraint today: `CHECK (status = ANY (ARRAY['pending','delivered','failed']))`
-- Idempotent/replayable design: Uses DROP CONSTRAINT IF EXISTS before adding, and CREATE UNIQUE INDEX IF NOT EXISTS.

BEGIN;

-- ============================================================================
-- Section 1: Update whatsapp_message_logs status CHECK constraint
-- ============================================================================

ALTER TABLE public.whatsapp_message_logs 
  DROP CONSTRAINT IF EXISTS whatsapp_message_logs_status_check;

ALTER TABLE public.whatsapp_message_logs 
  ADD CONSTRAINT whatsapp_message_logs_status_check 
  CHECK (status = ANY (ARRAY['pending','sent','delivered','read','failed','undeliverable']));

-- ============================================================================
-- Section 2: Optional Hardening - Partial Unique Index for Outbound wamid
-- ============================================================================

-- OPTIONAL HARDENING:
-- Verified pre-check query returned zero rows for outbound non-null wamids:
-- SELECT wamid FROM public.whatsapp_message_logs WHERE wamid IS NOT NULL AND direction = 'outbound' GROUP BY wamid HAVING COUNT(*) > 1;
-- Re-run this check before applying this migration to any other environment to prevent index creation failure if duplicate outbound wamids exist.
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_logs_wamid_outbound 
  ON public.whatsapp_message_logs (wamid) 
  WHERE wamid IS NOT NULL AND direction = 'outbound';

COMMIT;

-- ============================================================================
-- Smoke checks (manual verification)
-- ============================================================================
/*
-- 1. Verify check constraint definition
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid='public.whatsapp_message_logs'::regclass 
  AND conname='whatsapp_message_logs_status_check';

-- 2. Pre-add duplicate check for the unique index
SELECT wamid, COUNT(*) 
FROM public.whatsapp_message_logs 
WHERE wamid IS NOT NULL AND direction = 'outbound' 
GROUP BY wamid 
HAVING COUNT(*) > 1;

-- 3. Positive smoke check (inserts/updates to the new statuses succeed)
-- Start transaction to test and rollback
BEGIN;
INSERT INTO public.whatsapp_message_logs (user_id, phone_hash, channel, direction, status, content_preview, audience) 
VALUES (NULL, 'dummy_hash', 'whatsapp', 'outbound', 'sent', 'Test sent status', 'customer');
INSERT INTO public.whatsapp_message_logs (user_id, phone_hash, channel, direction, status, content_preview, audience) 
VALUES (NULL, 'dummy_hash', 'whatsapp', 'outbound', 'read', 'Test read status', 'customer');
INSERT INTO public.whatsapp_message_logs (user_id, phone_hash, channel, direction, status, content_preview, audience) 
VALUES (NULL, 'dummy_hash', 'whatsapp', 'outbound', 'undeliverable', 'Test undeliverable status', 'customer');
ROLLBACK;

-- 4. Negative smoke check (arbitrary status values are rejected)
BEGIN;
INSERT INTO public.whatsapp_message_logs (user_id, phone_hash, channel, direction, status, content_preview, audience) 
VALUES (NULL, 'dummy_hash', 'whatsapp', 'outbound', 'invalid_status_value', 'Test invalid status', 'customer');
-- Expected: ERROR: new row for relation "whatsapp_message_logs" violates check constraint "whatsapp_message_logs_status_check"
ROLLBACK;
*/
