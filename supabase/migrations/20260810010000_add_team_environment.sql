-- 20260810010000_add_team_environment.sql

-- 1. Add column with default
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production' 
CHECK (environment IN ('production', 'test'));

ALTER TABLE public.teams DISABLE TRIGGER trg_teams_hierarchy_check;

-- DEV_FINAL
UPDATE public.teams SET environment = 'test' WHERE id = '2f33d286-8cb8-4ce8-9d1d-e0fed9ccc5ef';
-- AASHIMA INTRUST TEAM
UPDATE public.teams SET environment = 'production' WHERE id = '630fa633-dcc0-4209-afbf-de8c0bf9b0dd';

ALTER TABLE public.teams ENABLE TRIGGER trg_teams_hierarchy_check;
