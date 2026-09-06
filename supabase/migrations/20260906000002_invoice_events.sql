-- Migration: 20260906000002_invoice_events.sql
-- Description: Create invoice_events table for auditing manual CRM/Admin actions.

CREATE TABLE IF NOT EXISTS public.invoice_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoice_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins and crm users to manage invoice events
CREATE POLICY "Allow CRM/Admin manage invoice events"
    ON public.invoice_events
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager')
        )
    );
