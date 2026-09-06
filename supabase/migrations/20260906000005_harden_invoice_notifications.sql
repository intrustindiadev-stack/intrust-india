-- Migration: 20260906000005_harden_invoice_notifications.sql
-- Description: Fortify RLS policies on invoice_notifications:
-- 1. Revoke client-side PostgREST INSERT and UPDATE permissions (service role exclusively manages logs).
-- 2. Scope PostgREST SELECT permissions by invoice ownership for non-manager executives (F-01, F-02).

-- Drop previous overly permissive policies
DROP POLICY IF EXISTS "Allow CRM/Admin select invoice notifications" ON public.invoice_notifications;
DROP POLICY IF EXISTS "Allow CRM/Admin insert invoice notifications" ON public.invoice_notifications;
DROP POLICY IF EXISTS "Allow CRM/Admin update invoice notifications" ON public.invoice_notifications;

-- Create hardened, scoped SELECT policy
CREATE POLICY "Allow CRM/Admin scoped select invoice notifications"
    ON public.invoice_notifications
    FOR SELECT
    USING (
        -- Admins and Managers can view all invoice notifications
        auth.uid() IN (
            SELECT id FROM public.user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_manager', 'relationship_manager')
        )
        OR
        -- Non-manager executives can ONLY view notifications for invoices they created
        (
            auth.uid() IN (
                SELECT id FROM public.user_profiles
                WHERE role IN ('sales_exec', 'relationship_exec')
            )
            AND
            invoice_id IN (
                SELECT id FROM public.invoices
                WHERE created_by = auth.uid()
            )
        )
    );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
