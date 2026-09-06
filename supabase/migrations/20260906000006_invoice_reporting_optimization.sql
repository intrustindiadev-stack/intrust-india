-- Migration: 20260906000006_invoice_reporting_optimization.sql
-- Description: Add composite indexes for reporting, AR aging calculations, reminder cron scanning, and dashboard pagination.

-- 1. Index for scoped dashboard pagination and date filtering
CREATE INDEX IF NOT EXISTS idx_invoices_created_by_status_date 
    ON public.invoices (created_by, status, invoice_date);

-- 2. Index for reminder cron scanning and Accounts Receivable aging calculations
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date 
    ON public.invoices (status, due_date);

-- 3. Index for default chronological pagination
CREATE INDEX IF NOT EXISTS idx_invoices_created_at_desc 
    ON public.invoices (created_at DESC);

-- 4. Index for notification status aggregation and delivery rate calculations
CREATE INDEX IF NOT EXISTS idx_invoice_notifications_lookup 
    ON public.invoice_notifications (invoice_id, notification_type, status);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
