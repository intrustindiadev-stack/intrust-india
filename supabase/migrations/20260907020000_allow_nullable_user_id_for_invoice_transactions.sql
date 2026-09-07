-- Migration: Allow nullable user_id on transactions for anonymous public invoice payments
-- Invoices are paid by external clients/customers who do not necessarily have an InTrust user account.
-- Transaction records for invoice payments link via udf1='INVOICE_PAY' and udf2=invoice_id.

ALTER TABLE public.transactions ALTER COLUMN user_id DROP NOT NULL;
