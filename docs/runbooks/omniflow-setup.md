> **Status:** Active Runbook

# Omniflow WhatsApp Integration Setup Guide

This guide covers everything needed to activate the WhatsApp OTP phone-linking flow
powered by [Omniflow](https://whatsapp.ominiflow.com).

---

## Step 1: Create an Omniflow Account

1. Sign up at https://whatsapp.ominiflow.com
2. Complete the onboarding and connect your Meta Business Account (MBA).
3. Note your **API Token** from the dashboard (Settings → API).

---

## Step 2: Configure Environment Variables

Add the following to your `.env.local` (never commit this file):

```env
# Omniflow WhatsApp API
OMNIFLOW_BASE_URL=https://whatsapp.ominiflow.com
OMNIFLOW_API_TOKEN=your_omniflow_token_here

# Meta WhatsApp Business API (if using direct Meta API alongside Omniflow)
META_WABA_ID=your_waba_id_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_ACCESS_TOKEN=your_permanent_access_token_here
META_WEBHOOK_VERIFY_TOKEN=your_random_verify_token_here

# Internal server-to-server auth (wallet-checkout → notify-order)
INTERNAL_API_TOKEN=your_32_char_random_string_here
```

---

## Step 3: Register the Omniflow Webhook

In the Omniflow dashboard → Settings → Webhooks, register:

```
https://intrustindia.com/api/webhooks/omniflow
```

This endpoint receives inbound WhatsApp messages.

---

## Step 5: Merchant Templates

These templates are designed for a premium merchant experience. Create them in the Omniflow dashboard under the **Utility** category with **English (en)** language.

> All template bodies, variables, and submission instructions are now maintained in `docs/runbooks/whatsapp-template-catalogue.md`.

> **Tracked templates (35 total):** `intrust_welcome_linked`, `intrust_kyc_update`, `intrust_transaction_alert`, `intrust_login_alert`, `intrust_merchant_welcome_linked`, `intrust_merchant_new_order`, `intrust_merchant_order_cancelled`, `intrust_merchant_payout_status`, `intrust_merchant_payout_requested`, `intrust_merchant_store_credit_request`, `intrust_merchant_store_credit_paid`, `intrust_merchant_gift_card_sold`, `intrust_merchant_bank_verified`, `intrust_merchant_approved`, `intrust_merchant_subscription_status`, `intrust_merchant_product_approved`, `intrust_merchant_procurement_sale`, `intrust_otp_verification`, `intrust_gm_greet_v1`, `intrust_gm_tip_v1`, `intrust_ge_greet_v1`, `intrust_reward_milestone_v1`, `intrust_referral_invite_v1`, `intrust_giftcard_promo_v1`, `intrust_winback_v1`, `intrust_feature_announce_v1`, `intrust_festival_greeting_v1`, `intrust_order_status_v1`, `intrust_wallet_low_balance_v1`, `intrust_kyc_reminder_v1`, `intrust_udhari_due_reminder_v1`, `intrust_merchant_subscription_expiring_v1`, `intrust_merchant_payout_failed_v1`, `intrust_investment_maturity_v1`, `intrust_merchant_transaction_alert_v1`.
---

## Cron Schedule

Both broadcast crons run daily on the VPS via `crontab -e`. The `CRON_SECRET` env var must be set in `/etc/environment` or the crontab environment block.

```cron
# Morning greeting — 08:00 IST (02:30 UTC)
30 2 * * * curl -s -X GET https://intrustindia.com/api/cron/morning-greeting \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1

# Evening greeting — 20:00 IST (14:30 UTC)
30 14 * * * curl -s -X GET https://intrustindia.com/api/cron/evening-greeting \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1

# Win-back campaign — Weekly on Mondays at 10:00 IST (04:30 UTC)
30 4 * * 1 curl -s -X GET https://intrustindia.com/api/cron/winback \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1

# KYC reminders — Daily at 11:00 IST (05:30 UTC)
30 5 * * * curl -s -X GET https://intrustindia.com/api/cron/kyc-reminders \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1

# Merchant Subscription Expiry — Daily at 11:30 IST (06:00 UTC)
0 6 * * * curl -s -X GET https://intrustindia.com/api/cron/subscription-expiry \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1

# Merchant Investment Maturity — Daily at 12:00 IST (06:30 UTC)
30 6 * * * curl -s -X GET https://intrustindia.com/api/cron/investment-maturity \
  -H "Authorization: Bearer $CRON_SECRET" >> /var/log/intrust-cron.log 2>&1
```

All crons write audit rows to `whatsapp_message_logs` with `content_preview` matching `[gm-broadcast-run:*]`, `[ge-broadcast-run:*]`, and `[winback-run:*]` respectively, so every run is visible even on zero recipients.

---

## Diagnostics

### Test a merchant WhatsApp template directly

Use this endpoint to verify that Omniflow can deliver a template to a specific merchant's linked phone, without waiting for an organic event.

**Requires:** admin or super_admin role (pass your Supabase session JWT as a Bearer token).

```bash
curl -X POST https://intrustindia.com/api/admin/whatsapp-test-merchant \
  -H "Authorization: Bearer <YOUR_ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantUserId": "fffaeff7-eaf7-48da-a0e9-7801108a38b1",
    "templateName": "intrust_merchant_new_order",
    "args": ["TESTORDER", "99.00", "1"]
  }'
```

**Success response (200):**
```json
{ "success": true, "phone": "+916232809817", "sentAt": "2026-05-09T12:00:00.000Z" }
```

**Failure response (502):**
```json
{ "success": false, "error": "..." }
```

Every attempt (success or failure) is recorded in `whatsapp_message_logs` with `content_preview` starting with `[ADMIN_TEST:...]` for easy filtering.
