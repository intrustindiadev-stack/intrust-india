CREATE TABLE IF NOT EXISTS public.reward_distribution_log (
    id uuid primary key default gen_random_uuid(),
    event_type text not null,
    source_user_id uuid,
    reference_id uuid,
    reference_type text,
    amount_paise bigint,
    success boolean not null,
    total_distributed bigint not null default 0,
    error_message text,
    correlation_id text,
    created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_reward_distribution_log_created_at ON public.reward_distribution_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_distribution_log_event_type ON public.reward_distribution_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_distribution_log_success ON public.reward_distribution_log (success, total_distributed);

ALTER TABLE public.reward_distribution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reward distribution logs"
ON public.reward_distribution_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('admin', 'super_admin')
    )
);
