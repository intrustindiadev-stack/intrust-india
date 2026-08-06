-- Territory Management · Part 2: team service areas + routing custody log
CREATE TABLE IF NOT EXISTS public.team_service_areas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    area_type    territory_area_type NOT NULL,
    value        TEXT NOT NULL,
    state        TEXT,
    city         TEXT,
    is_exclusive BOOLEAN NOT NULL DEFAULT true,
    priority     SMALLINT NOT NULL DEFAULT 0,
    created_by   UUID REFERENCES auth.users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    value_norm   TEXT GENERATED ALWAYS AS (lower(btrim(value))) STORED,
    state_norm   TEXT GENERATED ALWAYS AS (lower(btrim(state))) STORED,
    city_norm    TEXT GENERATED ALWAYS AS (lower(btrim(city)))  STORED,
    CONSTRAINT team_service_areas_value_not_blank CHECK (btrim(value) <> ''),
    CONSTRAINT team_service_areas_pincode_format
        CHECK (area_type <> 'pincode' OR value ~ '^[1-9][0-9]{5}$'),
    CONSTRAINT team_service_areas_requires_city
        CHECK (area_type NOT IN ('zone','area') OR (city IS NOT NULL AND btrim(city) <> ''))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_service_area_per_team
    ON public.team_service_areas (team_id, area_type, value_norm, coalesce(city_norm,''), coalesce(state_norm,''));

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_service_area_exclusive
    ON public.team_service_areas (area_type, value_norm, coalesce(city_norm,''), coalesce(state_norm,''))
    WHERE is_exclusive;

CREATE INDEX IF NOT EXISTS idx_tsa_lookup  ON public.team_service_areas (area_type, value_norm);
CREATE INDEX IF NOT EXISTS idx_tsa_team_id ON public.team_service_areas (team_id);

CREATE TABLE IF NOT EXISTS public.crm_lead_routing_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id      UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    from_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    to_team_id   UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    match_type   territory_area_type,
    reason       TEXT NOT NULL,
    actor_id     UUID REFERENCES auth.users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routing_log_lead ON public.crm_lead_routing_log (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_routing_log_team ON public.crm_lead_routing_log (to_team_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_team_service_areas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_team_service_areas ON public.team_service_areas;
CREATE TRIGGER trg_touch_team_service_areas
    BEFORE UPDATE ON public.team_service_areas
    FOR EACH ROW EXECUTE FUNCTION public.touch_team_service_areas_updated_at();

ALTER TABLE public.team_service_areas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_lead_routing_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.team_service_areas   TO authenticated;
GRANT SELECT ON public.crm_lead_routing_log TO authenticated;
