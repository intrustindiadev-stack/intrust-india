-- ============================================================
-- Territory-Based CRM Lead Visibility (Phase 5)
-- Migration Date: 2026-08-06
--
-- Problem: relationship_manager currently sees ALL 387 leads.
-- This is too permissive. Managers should only see leads assigned
-- to members of their managed team hierarchy.
--
-- Fix: Replace the permissive manager SELECT policy on crm_leads
-- with one that uses the crm_authorized_team_ids() function
-- (already exists in DB) to restrict visibility by team hierarchy.
--
-- Policy logic:
--   - relationship_exec: sees only their own assigned/created leads
--   - relationship_manager: sees all leads assigned_to any member
--     of their managed teams (via crm_authorized_team_ids())
--     PLUS their own leads
--   - admin / super_admin: sees all
--   - hr_manager / employee: sees nothing (no CRM access)
-- ============================================================

-- Drop the overly-permissive SELECT policy (added by rename migration)
DROP POLICY IF EXISTS "RM can view their own leads, Managers/Admins can view all" ON public.crm_leads;

-- Also drop any older versions of similar policies
DROP POLICY IF EXISTS "Sales can view their own leads, Managers/Admins can view all" ON public.crm_leads;
DROP POLICY IF EXISTS "crm_leads_select_policy" ON public.crm_leads;

-- Create the new territory-scoped policy
CREATE POLICY "crm_leads_select_territory_scoped"
    ON public.crm_leads FOR SELECT
    USING (
        CASE
            -- Admins see everything
            WHEN (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                IN ('admin', 'super_admin')
            THEN true

            -- Relationship managers see leads in their managed team hierarchy
            -- (any lead whose assigned_to user is a member of their subtree teams)
            -- plus leads they personally created/are assigned to
            WHEN (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                = 'relationship_manager'
            THEN (
                auth.uid() = assigned_to OR
                auth.uid() = created_by OR
                -- Lead is unassigned but in their team territory
                assigned_team_id = ANY(
                    SELECT t.team_id FROM public.team_get_user_subtree(auth.uid()) t
                ) OR
                -- Lead is assigned to a member of their managed teams
                assigned_to IN (
                    SELECT tm.user_id
                    FROM public.team_members tm
                    WHERE tm.team_id = ANY(
                        SELECT t.team_id FROM public.team_get_user_subtree(auth.uid()) t
                    )
                )
            )

            -- Relationship execs only see their own leads
            WHEN (SELECT role::text FROM public.user_profiles WHERE id = auth.uid())
                = 'relationship_exec'
            THEN (
                auth.uid() = assigned_to OR
                auth.uid() = created_by
            )

            -- All other roles: no CRM access via RLS
            ELSE false
        END
    );

-- Verify the new policy exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'crm_leads'
        AND policyname = 'crm_leads_select_territory_scoped'
    ) THEN
        RAISE EXCEPTION 'Territory-scoped policy was not created';
    END IF;
    RAISE NOTICE 'Territory-scoped CRM lead visibility policy applied. ✓';
END;
$$;
