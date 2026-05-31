-- Migration: 20260603_autoconnect_whatsapp_backfill
-- Backfills user_channel_bindings for all existing customers and merchants
-- that have a valid phone number, and ensures every merchant has a
-- merchant_notification_settings row.
-- No DROP / UPDATE / DELETE statements — purely additive.
-- All INSERTs use ON CONFLICT DO NOTHING for idempotency.

-- ============================================================
-- Section 1 — Backfill customer bindings
-- ============================================================
-- Insert one audience='customer' binding for every user_profiles row that:
--   • has role NOT IN ('merchant', 'admin', 'super_admin')
--   • has a phone that normalises to a valid E.164 number
--   • does not already have a (user_id, 'customer') row in user_channel_bindings
INSERT INTO public.user_channel_bindings (user_id, audience, phone, whatsapp_opt_in, linked_at)
SELECT
  up.id                                  AS user_id,
  'customer'                             AS audience,
  public.normalize_in_phone(up.phone)    AS phone,
  true                                   AS whatsapp_opt_in,
  now()                                  AS linked_at
FROM public.user_profiles up
WHERE up.role NOT IN ('merchant', 'admin', 'super_admin')
  AND public.normalize_in_phone(up.phone) IS NOT NULL
  AND public.normalize_in_phone(up.phone) ~ '^\+[1-9]\d{1,14}$'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_channel_bindings ucb
    WHERE ucb.user_id = up.id
      AND ucb.audience = 'customer'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Section 2 — Backfill merchant bindings
-- ============================================================
-- Insert one audience='merchant' binding for every merchant that:
--   • joins merchants m to user_profiles up on m.user_id = up.id
--   • has up.role IN ('merchant', 'admin', 'super_admin')
--   • has COALESCE(m.business_phone, up.phone) that normalises to valid E.164
--   • does not already have a (m.user_id, 'merchant') row in user_channel_bindings
INSERT INTO public.user_channel_bindings (user_id, audience, phone, whatsapp_opt_in, linked_at)
SELECT
  m.user_id                                                           AS user_id,
  'merchant'                                                          AS audience,
  public.normalize_in_phone(COALESCE(m.business_phone, up.phone))    AS phone,
  true                                                                AS whatsapp_opt_in,
  now()                                                               AS linked_at
FROM public.merchants m
JOIN public.user_profiles up ON up.id = m.user_id
WHERE up.role IN ('merchant', 'admin', 'super_admin')
  AND public.normalize_in_phone(COALESCE(m.business_phone, up.phone)) IS NOT NULL
  AND public.normalize_in_phone(COALESCE(m.business_phone, up.phone)) ~ '^\+[1-9]\d{1,14}$'
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_channel_bindings ucb
    WHERE ucb.user_id = m.user_id
      AND ucb.audience = 'merchant'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- Section 3 — Defensive merchant_notification_settings re-insert
-- ============================================================
-- Mirror the exact pattern from 20260509_add_whatsapp_master_toggle.sql (lines 17–22).
-- Insert one merchant_notification_settings row for every merchants row that
-- does not yet have one. Column defaults handle all remaining columns:
--   whatsapp_notifications = true, all sub-flags = true, whatsapp_marketing = false.
INSERT INTO public.merchant_notification_settings (merchant_id)
SELECT m.id FROM public.merchants m
WHERE NOT EXISTS (
  SELECT 1 FROM public.merchant_notification_settings mns
  WHERE mns.merchant_id = m.id
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Smoke-check queries (commented out — run manually post-deploy)
-- ============================================================

-- 1. Count of newly inserted customer bindings vs. eligible user_profiles rows
-- SELECT
--   (SELECT COUNT(*) FROM public.user_channel_bindings WHERE audience = 'customer') AS customer_bindings,
--   (
--     SELECT COUNT(*) FROM public.user_profiles up
--     WHERE up.role NOT IN ('merchant', 'admin', 'super_admin')
--       AND public.normalize_in_phone(up.phone) IS NOT NULL
--       AND public.normalize_in_phone(up.phone) ~ '^\+[1-9]\d{1,14}$'
--   ) AS eligible_customers;

-- 2. Count of newly inserted merchant bindings vs. eligible merchants rows
-- SELECT
--   (SELECT COUNT(*) FROM public.user_channel_bindings WHERE audience = 'merchant') AS merchant_bindings,
--   (
--     SELECT COUNT(*) FROM public.merchants m
--     JOIN public.user_profiles up ON up.id = m.user_id
--     WHERE up.role IN ('merchant', 'admin', 'super_admin')
--       AND public.normalize_in_phone(COALESCE(m.business_phone, up.phone)) IS NOT NULL
--       AND public.normalize_in_phone(COALESCE(m.business_phone, up.phone)) ~ '^\+[1-9]\d{1,14}$'
--   ) AS eligible_merchants;

-- 3. Confirm zero rows in user_channel_bindings where phone does not match E.164
-- SELECT COUNT(*) AS invalid_phone_rows
-- FROM public.user_channel_bindings
-- WHERE phone IS NOT NULL
--   AND phone !~ '^\+[1-9]\d{1,14}$';

-- 4. Confirm no duplicate (user_id, audience) pairs
-- SELECT user_id, audience, COUNT(*) AS cnt
-- FROM public.user_channel_bindings
-- GROUP BY user_id, audience
-- HAVING COUNT(*) > 1;
