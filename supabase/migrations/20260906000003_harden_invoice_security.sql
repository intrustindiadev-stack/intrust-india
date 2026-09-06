-- Migration: 20260906000003_harden_invoice_security.sql
-- Description:
-- 1. Drop public select RLS policy on public.invoices (fixes F-01 CRITICAL)
-- 2. Correct invoice_events.actor_id foreign key to public.user_profiles(id) (fixes F-03 HIGH)
-- 3. Restrict invoice_events RLS policies to SELECT and INSERT only (fixes F-04 HIGH)

-- Step 1: Drop vulnerable public select policy on public.invoices
DROP POLICY IF EXISTS "Allow public select by token" ON public.invoices;

-- Step 2: Correct foreign key constraint on public.invoice_events
ALTER TABLE public.invoice_events DROP CONSTRAINT IF EXISTS invoice_events_actor_id_fkey;
ALTER TABLE public.invoice_events DROP CONSTRAINT IF EXISTS invoice_events_actor_id_user_profiles_fkey;

ALTER TABLE public.invoice_events 
    ADD CONSTRAINT invoice_events_actor_id_user_profiles_fkey 
    FOREIGN KEY (actor_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Step 3: Harden RLS on public.invoice_events
-- Drop blanket FOR ALL policy
DROP POLICY IF EXISTS "Allow CRM/Admin manage invoice events" ON public.invoice_events;
DROP POLICY IF EXISTS "Allow CRM/Admin select invoice events" ON public.invoice_events;
DROP POLICY IF EXISTS "Allow CRM/Admin insert invoice events" ON public.invoice_events;

-- Create restrictive SELECT policy
CREATE POLICY "Allow CRM/Admin select invoice events"
    ON public.invoice_events
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager')
        )
    );

-- Create restrictive INSERT policy
CREATE POLICY "Allow CRM/Admin insert invoice events"
    ON public.invoice_events
    FOR INSERT
    WITH CHECK (
        (actor_id IS NULL OR auth.uid() = actor_id) AND
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager')
        )
    );

-- Reload PostgREST schema cache to ensure foreign keys and policies are immediately recognized
NOTIFY pgrst, 'reload schema';
