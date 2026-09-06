-- Migration: 20260906000004_invoice_notifications.sql
-- Description: Create dedicated invoice_notifications table for tracking delivery, idempotency, and auditability.

CREATE TABLE IF NOT EXISTS public.invoice_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN (
        'INVOICE_CREATED',
        'INVOICE_RESENT',
        'PAYMENT_SUCCESS',
        'PARTIAL_PAYMENT',
        'PAYMENT_FAILED',
        'DUE_SOON',
        'OVERDUE'
    )),
    channel TEXT NOT NULL CHECK (channel IN ('EMAIL', 'WHATSAPP')),
    recipient TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
    idempotency_key TEXT UNIQUE NOT NULL,
    provider_message_id TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_notifications_invoice_id 
    ON public.invoice_notifications (invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoice_notifications_idempotency 
    ON public.invoice_notifications (idempotency_key);

-- Enable RLS
ALTER TABLE public.invoice_notifications ENABLE ROW LEVEL SECURITY;

-- Allow CRM / Admin roles to view invoice notifications
CREATE POLICY "Allow CRM/Admin select invoice notifications"
    ON public.invoice_notifications
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager')
        )
    );

-- Allow CRM / Admin roles to insert invoice notifications
CREATE POLICY "Allow CRM/Admin insert invoice notifications"
    ON public.invoice_notifications
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM public.user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager')
        )
    );

-- Allow CRM / Admin roles to update invoice notifications (e.g. status updates / retries)
CREATE POLICY "Allow CRM/Admin update invoice notifications"
    ON public.invoice_notifications
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.user_profiles
            WHERE role IN ('admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager')
        )
    );

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
