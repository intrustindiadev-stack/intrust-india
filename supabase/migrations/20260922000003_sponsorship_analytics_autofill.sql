-- Sponsorship analytics: auto-fill denormalised columns on insert.
--
-- The beacon API route (app/api/marketing/sponsor/analytics/route.js) only knows
-- the sponsorship_id. `sponsor_date` is NOT NULL, so a BEFORE INSERT trigger
-- derives sponsor_date + merchant_id from daily_challenge_sponsorships and
-- defaults metadata to an empty object. This keeps the route a single tiny
-- insert (fast, no extra round-trip) while guaranteeing valid rows.

CREATE OR REPLACE FUNCTION public.fill_sponsorship_analytics_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date     date;
    v_merchant uuid;
BEGIN
    -- Only look up what is actually missing.
    IF NEW.sponsor_date IS NULL OR NEW.merchant_id IS NULL THEN
        SELECT s.sponsor_date, s.merchant_id
          INTO v_date, v_merchant
          FROM public.daily_challenge_sponsorships s
         WHERE s.id = NEW.sponsorship_id;

        NEW.sponsor_date := COALESCE(NEW.sponsor_date, v_date, CURRENT_DATE);
        NEW.merchant_id  := COALESCE(NEW.merchant_id, v_merchant);
    END IF;

    IF NEW.metadata IS NULL THEN
        NEW.metadata := '{}'::jsonb;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_sponsorship_analytics_event
    ON public.sponsorship_analytics_events;

CREATE TRIGGER trg_fill_sponsorship_analytics_event
    BEFORE INSERT ON public.sponsorship_analytics_events
    FOR EACH ROW
    EXECUTE FUNCTION public.fill_sponsorship_analytics_event();

-- One row per visitor per event type per sponsorship per day for impressions,
-- so a refresh-heavy client cannot inflate unique reach. Aggregate counters read
-- DISTINCT visitor_id anyway, but this index keeps those scans fast.
CREATE INDEX IF NOT EXISTS idx_sponsorship_analytics_type_visitor
    ON public.sponsorship_analytics_events(sponsorship_id, event_type, visitor_id, created_at);
