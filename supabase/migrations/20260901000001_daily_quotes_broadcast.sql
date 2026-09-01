-- =============================================================
-- Migration: Daily Quotes Broadcast
-- File: 20260901000001_daily_quotes_broadcast.sql
-- Purpose: Stores admin-scheduled Good Morning quotes used by
--          the morning broadcast cron. Audit reuses the existing
--          whatsapp_message_logs table (no new log table needed).
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- ENUM
-- ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM ('scheduled', 'sent', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ──────────────────────────────────────────────────────────────
-- TABLE: daily_quotes
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_quotes (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_text       TEXT         NOT NULL,
  author_or_source TEXT,
  scheduled_date   DATE         NOT NULL,
  status           quote_status NOT NULL DEFAULT 'scheduled',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_quotes_scheduled_date_unique UNIQUE (scheduled_date)
);

COMMENT ON TABLE public.daily_quotes IS
  'Admin-scheduled Good Morning quotes broadcast via WhatsApp at 08:00 IST.';
COMMENT ON COLUMN public.daily_quotes.scheduled_date IS
  'The calendar date this quote is broadcast. Unique — one quote per day.';
COMMENT ON COLUMN public.daily_quotes.status IS
  'scheduled = queued, sent = cron fired successfully, archived = skipped/removed.';
COMMENT ON COLUMN public.daily_quotes.author_or_source IS
  'Stored for admin reference only — not included in the WhatsApp message body.';

-- Indexes for cron query (lookup by date + status) and admin UI (sort by date)
CREATE INDEX IF NOT EXISTS idx_daily_quotes_scheduled_date
  ON public.daily_quotes (scheduled_date);

CREATE INDEX IF NOT EXISTS idx_daily_quotes_status
  ON public.daily_quotes (status);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;

-- Block anonymous access entirely
CREATE POLICY "daily_quotes_deny_anon"
  ON public.daily_quotes
  FOR ALL
  TO anon
  USING (false);

-- Admins (admin / super_admin roles) can read all rows
CREATE POLICY "daily_quotes_admin_select"
  ON public.daily_quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Admins can insert, update, and delete
CREATE POLICY "daily_quotes_admin_write"
  ON public.daily_quotes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- service_role (used by the cron backend) bypasses RLS entirely — no policy needed.

-- ──────────────────────────────────────────────────────────────
-- VIEW: quote_delivery_summary
-- Aggregates sent/failed counts from the existing whatsapp_message_logs
-- table so the Admin UI gets delivery stats without a separate log table.
-- Counts rows where content_preview LIKE '[gm-broadcast:<date>]' AND
-- the log row is NOT the broadcast-run audit row (user_id IS NOT NULL).
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.quote_delivery_summary AS
SELECT
  dq.id,
  dq.quote_text,
  dq.author_or_source,
  dq.scheduled_date,
  dq.status,
  dq.created_at,
  COUNT(wml.id)                                              AS total_attempts,
  COUNT(wml.id) FILTER (WHERE wml.status = 'sent')          AS delivered,
  COUNT(wml.id) FILTER (WHERE wml.status = 'failed')        AS failed
FROM public.daily_quotes dq
LEFT JOIN public.whatsapp_message_logs wml
  ON  wml.content_preview = '[gm-broadcast:' || TO_CHAR(dq.scheduled_date, 'DD/MM/YYYY') || ']'
  AND wml.user_id IS NOT NULL   -- exclude broadcast-run audit rows (user_id = null)
GROUP BY
  dq.id,
  dq.quote_text,
  dq.author_or_source,
  dq.scheduled_date,
  dq.status,
  dq.created_at
ORDER BY dq.scheduled_date DESC;

COMMENT ON VIEW public.quote_delivery_summary IS
  'Delivery stats per daily quote for the Admin UI. Joins daily_quotes with '
  'whatsapp_message_logs using the existing gm-broadcast dedupe tag as the '
  'correlation key — no new log table required.';
