-- Adds a partial index on whatsapp_message_logs(wamid)
-- Required for efficient idempotency deduplication in /api/webhooks/omniflow/route.js
-- which queries: .from('whatsapp_message_logs').select('id').eq('wamid', wamid)
-- The WHERE clause excludes NULL wamids (delivery receipts / system events) from the index
-- so it stays lean and the lookup only applies to genuine inbound message IDs.
-- Safe to replay: CREATE INDEX IF NOT EXISTS is a no-op if the index already exists.

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_wamid
  ON public.whatsapp_message_logs (wamid)
  WHERE wamid IS NOT NULL;
