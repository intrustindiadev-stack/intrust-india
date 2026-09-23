-- Sponsorship campaign analytics: billboard impressions + product click tracking
-- One row per event; inserted via service-role only (API route), read on sponsor history detail page.
CREATE TABLE IF NOT EXISTS public.sponsorship_analytics_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsorship_id uuid NOT NULL REFERENCES public.daily_challenge_sponsorships(id) ON DELETE CASCADE,
    merchant_id uuid,
    sponsor_date date NOT NULL,
    event_type text NOT NULL CHECK (event_type IN ('IMPRESSION', 'PRODUCT_CLICK')),
    product_id uuid,
    user_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsorship_analytics_sponsorship
    ON public.sponsorship_analytics_events(sponsorship_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_sponsorship_analytics_date_merchant
    ON public.sponsorship_analytics_events(sponsor_date, merchant_id, event_type);

-- RLS enabled with NO policies: only service-role (admin client) writes/reads.
ALTER TABLE public.sponsorship_analytics_events ENABLE ROW LEVEL SECURITY;
