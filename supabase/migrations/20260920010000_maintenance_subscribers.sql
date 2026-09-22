-- Migration: 20260920010000_maintenance_subscribers.sql
-- Description: Create maintenance_subscribers table for notifying users when maintenance ends

CREATE TABLE IF NOT EXISTS public.maintenance_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('email', 'whatsapp')),
    contact_value VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified')),
    ip_address VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,
    CONSTRAINT unique_maintenance_subscriber UNIQUE (contact_type, contact_value)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_maintenance_subscribers_status ON public.maintenance_subscribers (status);
CREATE INDEX IF NOT EXISTS idx_maintenance_subscribers_created ON public.maintenance_subscribers (created_at DESC);

-- Enable RLS
ALTER TABLE public.maintenance_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insert into maintenance_subscribers (with upsert on conflict)
CREATE POLICY "Allow public insert to maintenance_subscribers" 
ON public.maintenance_subscribers FOR INSERT 
TO anon, authenticated, service_role
WITH CHECK (true);

-- Allow service role full management
CREATE POLICY "Allow service_role full access to maintenance_subscribers" 
ON public.maintenance_subscribers FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);
