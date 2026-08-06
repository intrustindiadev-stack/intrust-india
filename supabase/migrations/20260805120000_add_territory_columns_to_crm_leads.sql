-- Territory Management · Part 1: crm_leads location + routing columns
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'territory_area_type') THEN
        CREATE TYPE territory_area_type AS ENUM ('pincode', 'zone', 'area', 'city', 'state');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_routing_status') THEN
        CREATE TYPE lead_routing_status AS ENUM ('unmatched', 'auto_matched', 'manual_override', 'reroute_pending');
    END IF;
END $$;

ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS zone    TEXT,
    ADD COLUMN IF NOT EXISTS pincode TEXT;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_leads_pincode_format_chk') THEN
        ALTER TABLE public.crm_leads
            ADD CONSTRAINT crm_leads_pincode_format_chk
            CHECK (pincode IS NULL OR pincode ~ '^[1-9][0-9]{5}$');
    END IF;
END $$;

ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS state_norm TEXT GENERATED ALWAYS AS (lower(btrim(state))) STORED,
    ADD COLUMN IF NOT EXISTS city_norm  TEXT GENERATED ALWAYS AS (lower(btrim(city)))  STORED,
    ADD COLUMN IF NOT EXISTS area_norm  TEXT GENERATED ALWAYS AS (lower(btrim(area)))  STORED,
    ADD COLUMN IF NOT EXISTS zone_norm  TEXT GENERATED ALWAYS AS (lower(btrim(zone)))  STORED;

ALTER TABLE public.crm_leads
    ADD COLUMN IF NOT EXISTS assigned_team_id     UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS territory_match_type territory_area_type,
    ADD COLUMN IF NOT EXISTS routing_status       lead_routing_status NOT NULL DEFAULT 'unmatched',
    ADD COLUMN IF NOT EXISTS routed_at            TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_crm_leads_team_status  ON public.crm_leads (assigned_team_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_team_created ON public.crm_leads (assigned_team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_pincode      ON public.crm_leads (pincode) WHERE pincode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_geo_norm     ON public.crm_leads (state_norm, city_norm, area_norm);
CREATE INDEX IF NOT EXISTS idx_crm_leads_unmatched    ON public.crm_leads (created_at DESC) WHERE routing_status = 'unmatched';

COMMENT ON COLUMN public.crm_leads.routing_status IS
  'manual_override freezes the lead against automatic re-routing on location edits.';
