-- Multi-user scaling: duplicate-claim check + per-user claim progress lookups
-- run as (user_id, target_id) index scans.
CREATE INDEX IF NOT EXISTS idx_marketing_target_claims_user_target
    ON public.marketing_target_claims(user_id, target_id);