-- Adds visitor identity to sponsorship analytics events.
-- Needed because the analytics beacon (app/api/marketing/sponsor/analytics/route.js)
-- writes a first-party cookie visitor id so we can dedupe reach:
--   unique_players / unique_viewers instead of raw repeated page views.
ALTER TABLE public.sponsorship_analytics_events
    ADD COLUMN IF NOT EXISTS visitor_id text;

CREATE INDEX IF NOT EXISTS idx_sponsorship_analytics_visitor
    ON public.sponsorship_analytics_events(sponsorship_id, visitor_id);
