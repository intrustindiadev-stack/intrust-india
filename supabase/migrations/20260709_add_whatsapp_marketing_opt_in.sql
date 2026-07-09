-- Migration: 20260709_add_whatsapp_marketing_opt_in
-- Adds a separate marketing/promotional consent flag to user_channel_bindings.
-- Distinct from whatsapp_opt_in (transactional alerts) so Meta marketing
-- category templates can be gated independently.
-- No DROP statements — purely additive.
-- No backfill to true — compliance requires explicit user opt-in.

ALTER TABLE public.user_channel_bindings
  ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_channel_bindings.whatsapp_marketing_opt_in
  IS 'Consent for marketing/promotional WhatsApp templates (e.g. morning greetings, offers).
Separate from whatsapp_opt_in (transactional). Defaults false — users must explicitly
opt in via the profile settings toggle. Required by Meta marketing category rules.';
