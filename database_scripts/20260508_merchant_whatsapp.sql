-- Purpose: Introduce `audience` discriminator across WhatsApp + webchat tables to enable merchant-side WhatsApp/webchat alongside the existing customer flow.
-- Backward compatibility: Every existing row defaults to `audience='customer'`; the customer endpoints continue to work because their queries will be updated in the next phase to pass `audience='customer'`.
-- FORWARD-ACTION REQUIRED IN CODE: The upsert `onConflict` keys in `app/api/webhooks/omniflow/route.js` and `app/api/whatsapp/verify-otp/route.js` MUST become `'user_id,audience'` to align with the new composite unique constraint. Do not miss this!

BEGIN;

-- ============================================================================
-- Section 1: user_channel_bindings
-- ============================================================================

ALTER TABLE public.user_channel_bindings 
ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'customer';

-- Comment explaining the column
COMMENT ON COLUMN public.user_channel_bindings.audience IS 'Discriminator: customer vs merchant';

DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.user_channel_bindings'::regclass 
        AND conname = 'user_channel_bindings_audience_check'
    ) THEN
        ALTER TABLE public.user_channel_bindings 
        ADD CONSTRAINT user_channel_bindings_audience_check 
        CHECK (audience IN ('customer','merchant'));
    END IF;
END
$do$;

-- Defensive backfill
UPDATE public.user_channel_bindings 
SET audience = 'customer' 
WHERE audience IS NULL OR audience = '';

-- Drop old single-column uniques
ALTER TABLE public.user_channel_bindings DROP CONSTRAINT IF EXISTS user_channel_bindings_user_id_key;
ALTER TABLE public.user_channel_bindings DROP CONSTRAINT IF EXISTS user_channel_bindings_phone_key;

-- Add new composite uniques
DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.user_channel_bindings'::regclass 
        AND conname = 'user_channel_bindings_user_id_audience_key'
    ) THEN
        ALTER TABLE public.user_channel_bindings 
        ADD CONSTRAINT user_channel_bindings_user_id_audience_key 
        UNIQUE (user_id, audience);
    END IF;
END
$do$;

DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.user_channel_bindings'::regclass 
        AND conname = 'user_channel_bindings_phone_audience_key'
    ) THEN
        ALTER TABLE public.user_channel_bindings 
        ADD CONSTRAINT user_channel_bindings_phone_audience_key 
        UNIQUE (phone, audience);
    END IF;
END
$do$;

-- Add supporting non-unique index for inbound-webhook lookups
CREATE INDEX IF NOT EXISTS idx_user_channel_bindings_phone 
ON public.user_channel_bindings (phone);


-- ============================================================================
-- Section 2: webchat_sessions and webchat_messages
-- ============================================================================

ALTER TABLE public.webchat_sessions 
ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'customer';

DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.webchat_sessions'::regclass 
        AND conname = 'webchat_sessions_audience_check'
    ) THEN
        ALTER TABLE public.webchat_sessions 
        ADD CONSTRAINT webchat_sessions_audience_check 
        CHECK (audience IN ('customer','merchant'));
    END IF;
END
$do$;

ALTER TABLE public.webchat_messages 
ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'customer';

DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.webchat_messages'::regclass 
        AND conname = 'webchat_messages_audience_check'
    ) THEN
        ALTER TABLE public.webchat_messages 
        ADD CONSTRAINT webchat_messages_audience_check 
        CHECK (audience IN ('customer','merchant'));
    END IF;
END
$do$;

CREATE INDEX IF NOT EXISTS idx_webchat_sessions_user_audience 
ON public.webchat_sessions (user_id, audience, last_active_at DESC);

-- Drop and recreate webchat_sessions policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.webchat_sessions;
DROP POLICY IF EXISTS "Users can insert/update their own sessions" ON public.webchat_sessions;

CREATE POLICY "Users can view their own sessions" 
ON public.webchat_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update their own sessions" 
ON public.webchat_sessions FOR ALL 
USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own sessions" ON public.webchat_sessions IS 'Audience scoping is enforced at the application layer since auth.jwt() does not carry an audience claim.';
COMMENT ON POLICY "Users can insert/update their own sessions" ON public.webchat_sessions IS 'Audience scoping is enforced at the application layer since auth.jwt() does not carry an audience claim.';

-- Drop and recreate webchat_messages policies
DROP POLICY IF EXISTS "Users can view their own messages" ON public.webchat_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.webchat_messages;

CREATE POLICY "Users can view their own messages" 
ON public.webchat_messages FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages" 
ON public.webchat_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own messages" ON public.webchat_messages IS 'Audience scoping is enforced at the application layer since auth.jwt() does not carry an audience claim.';
COMMENT ON POLICY "Users can insert their own messages" ON public.webchat_messages IS 'Audience scoping is enforced at the application layer since auth.jwt() does not carry an audience claim.';


-- ============================================================================
-- Section 3: whatsapp_message_logs
-- ============================================================================

ALTER TABLE public.whatsapp_message_logs 
ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'customer';

DO $do$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.whatsapp_message_logs'::regclass 
        AND conname = 'whatsapp_message_logs_audience_check'
    ) THEN
        ALTER TABLE public.whatsapp_message_logs 
        ADD CONSTRAINT whatsapp_message_logs_audience_check 
        CHECK (audience IN ('customer','merchant'));
    END IF;
END
$do$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_logs_audience_created_at 
ON public.whatsapp_message_logs (audience, created_at DESC);


-- ============================================================================
-- Section 4: merchant_notification_settings
-- ============================================================================

ALTER TABLE public.merchant_notification_settings 
ADD COLUMN IF NOT EXISTS whatsapp_order_alerts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_payout_alerts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_store_credit_alerts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_kyc_alerts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_subscription_alerts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_product_alerts boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_marketing boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_order_alerts IS 'MERCHANT_NEW_ORDER_TEMPLATE';
COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_payout_alerts IS 'MERCHANT_PAYOUT_TEMPLATE';
COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_store_credit_alerts IS 'MERCHANT_STORE_CREDIT_TEMPLATE';
COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_kyc_alerts IS 'MERCHANT_KYC_TEMPLATE';
COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_subscription_alerts IS 'MERCHANT_SUBSCRIPTION_TEMPLATE';
COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_product_alerts IS 'MERCHANT_PRODUCT_TEMPLATE';
COMMENT ON COLUMN public.merchant_notification_settings.whatsapp_marketing IS 'MERCHANT_MARKETING_TEMPLATE';


-- ============================================================================
-- Section 5: merchant_whatsapp_status view
-- ============================================================================

CREATE OR REPLACE VIEW public.merchant_whatsapp_status 
WITH (security_invoker = true)
AS 
SELECT 
    m.id AS merchant_id, 
    m.user_id, 
    m.business_name, 
    m.business_phone, 
    ucb.phone AS linked_phone, 
    ucb.whatsapp_opt_in, 
    ucb.linked_at 
FROM public.merchants m 
LEFT JOIN public.user_channel_bindings ucb 
    ON ucb.user_id = m.user_id AND ucb.audience = 'merchant';


-- ============================================================================
-- Section 6: Permissions / GRANTs
-- ============================================================================

GRANT ALL ON TABLE public.user_channel_bindings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_message_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.webchat_sessions TO authenticated, service_role;
GRANT ALL ON TABLE public.webchat_messages TO authenticated, service_role;
GRANT ALL ON TABLE public.merchant_notification_settings TO service_role, postgres;
GRANT SELECT ON public.merchant_whatsapp_status TO authenticated, service_role;

COMMIT;

-- ============================================================================
-- Smoke checks (manual verification)
-- ============================================================================
/*
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='user_channel_bindings';
SELECT conname FROM pg_constraint WHERE conrelid = 'public.user_channel_bindings'::regclass;
SELECT * FROM public.merchant_whatsapp_status LIMIT 5;
*/
