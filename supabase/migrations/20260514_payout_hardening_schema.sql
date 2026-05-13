-- =============================================================================
-- Migration: 20260514_payout_hardening_schema
-- Purpose  : Extend payout_requests with hardening columns, create the
--            payout_request_events audit table, seed velocity-limit keys into
--            platform_settings, and enable realtime on payout_requests.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Extend payout_requests
-- ---------------------------------------------------------------------------

-- Idempotency key (set by client, enforced unique per merchant)
ALTER TABLE public.payout_requests
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT NULL;

-- Paise column — plain BIGINT so RPC INSERTs can set it directly.
-- Backfill existing rows from the amount column.
ALTER TABLE public.payout_requests
    ADD COLUMN IF NOT EXISTS amount_paise BIGINT NULL;

UPDATE public.payout_requests
SET amount_paise = ROUND(amount * 100)
WHERE amount_paise IS NULL;

-- Forensics columns
ALTER TABLE public.payout_requests
    ADD COLUMN IF NOT EXISTS requested_ip TEXT NULL;

ALTER TABLE public.payout_requests
    ADD COLUMN IF NOT EXISTS requested_user_agent TEXT NULL;

-- Partial unique index: prevents duplicate idempotency keys per merchant
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_requests_idempotency
    ON public.payout_requests (merchant_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- idx_payout_requests_requested_at already exists per payout_requests_schema.sql


-- ---------------------------------------------------------------------------
-- 2. Create payout_request_events (append-only audit log)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payout_request_events (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_id   UUID        NOT NULL REFERENCES public.payout_requests(id) ON DELETE CASCADE,
    actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,
    from_status TEXT        NULL,
    to_status   TEXT        NULL,
    payload     JSONB       NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payout_request_events_action_check
        CHECK (action IN ('requested', 'approved', 'released', 'rejected', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_payout_request_events_payout_id
    ON public.payout_request_events (payout_id);

CREATE INDEX IF NOT EXISTS idx_payout_request_events_created_at
    ON public.payout_request_events (created_at DESC);

-- Enable RLS
ALTER TABLE public.payout_request_events ENABLE ROW LEVEL SECURITY;

-- Merchant can SELECT rows for their own payout requests
CREATE POLICY "merchant_view_own_payout_request_events"
    ON public.payout_request_events
    FOR SELECT
    USING (
        payout_id IN (
            SELECT id FROM public.payout_requests
            WHERE user_id = auth.uid()
        )
    );

-- Admin / super_admin can SELECT all rows (mirrors payout_requests admin policy)
CREATE POLICY "admin_view_all_payout_request_events"
    ON public.payout_request_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND role IN ('admin', 'super_admin')
        )
    );

-- No UPDATE or DELETE policies — this table is append-only.


-- ---------------------------------------------------------------------------
-- 3. Seed payout velocity-limit keys in platform_settings
-- ---------------------------------------------------------------------------

INSERT INTO public.platform_settings (key, value, description)
VALUES
    ('payout_min_amount_paise',   '10000', 'Minimum payout per request in paise (₹100)'),
    ('payout_max_amount_paise',   NULL,    'Maximum payout per request in paise (NULL = unlimited)'),
    ('payout_max_per_day_paise',  NULL,    'Per-merchant daily payout cap in paise (NULL = unlimited)'),
    ('payout_max_per_month_paise',NULL,    'Per-merchant monthly payout cap in paise (NULL = unlimited)'),
    ('payout_max_pending_count',  '1',     'Max simultaneous pending payout requests per source per merchant')
ON CONFLICT (key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 4. Enable realtime on payout_requests
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.payout_requests;

ALTER TABLE public.payout_requests REPLICA IDENTITY FULL;
