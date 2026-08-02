-- Migration: Add CRM columns and RLS policies to whatsapp_message_logs
-- Supports WhatsApp Template Trigger feature in CRM

BEGIN;

-- 1. Create table if not existing or alter to add CRM columns
CREATE TABLE IF NOT EXISTS public.whatsapp_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_message_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID NULL,
    ADD COLUMN IF NOT EXISTS agent_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS contact_id UUID NULL REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS recipient_type TEXT NULL,
    ADD COLUMN IF NOT EXISTS recipient_phone_e164 TEXT NULL,
    ADD COLUMN IF NOT EXISTS template_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS template_name TEXT NULL,
    ADD COLUMN IF NOT EXISTS template_language TEXT NULL,
    ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS payload_sent JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS provider_message_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued',
    ADD COLUMN IF NOT EXISTS error_code TEXT NULL,
    ADD COLUMN IF NOT EXISTS error_message TEXT NULL,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ NULL;

-- 2. Constraints & Indexes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.whatsapp_message_logs'::regclass 
        AND conname = 'whatsapp_message_logs_recipient_type_check'
    ) THEN
        ALTER TABLE public.whatsapp_message_logs 
        ADD CONSTRAINT whatsapp_message_logs_recipient_type_check 
        CHECK (recipient_type IS NULL OR recipient_type IN ('contact', 'custom_number'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_tenant_created 
    ON public.whatsapp_message_logs (tenant_id, created_at DESC) 
    WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_agent 
    ON public.whatsapp_message_logs (agent_id) 
    WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_provider_msg_id 
    ON public.whatsapp_message_logs (provider_message_id) 
    WHERE provider_message_id IS NOT NULL;

-- 3. Enable RLS
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Agents can view their tenant or own whatsapp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Agents can view their tenant or own whatsapp logs"
    ON public.whatsapp_message_logs FOR SELECT
    USING (
        auth.uid() = agent_id OR
        auth.uid() = user_id OR
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'sales_manager', 'relationship_manager')
    );

DROP POLICY IF EXISTS "Agents can insert whatsapp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Agents can insert whatsapp logs"
    ON public.whatsapp_message_logs FOR INSERT
    WITH CHECK (
        auth.uid() = agent_id OR
        auth.uid() = user_id OR
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Agents can update own whatsapp logs" ON public.whatsapp_message_logs;
CREATE POLICY "Agents can update own whatsapp logs"
    ON public.whatsapp_message_logs FOR UPDATE
    USING (
        auth.uid() = agent_id OR
        auth.uid() = user_id OR
        (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
    );

-- 5. Grants
GRANT ALL ON TABLE public.whatsapp_message_logs TO authenticated, service_role;

COMMIT;
