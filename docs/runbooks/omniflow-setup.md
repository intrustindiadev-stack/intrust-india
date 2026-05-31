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

> **Tracked templates (17 total):** `intrust_welcome_linked`, `intrust_kyc_update`, `intrust_transaction_alert`, `intrust_login_alert`, `intrust_merchant_welcome_linked`, `intrust_merchant_new_order`, `intrust_merchant_order_cancelled`, `intrust_merchant_payout_status`, **`intrust_merchant_payout_requested`**, `intrust_merchant_store_credit_request`, `intrust_merchant_store_credit_paid`, `intrust_merchant_gift_card_sold`, `intrust_merchant_bank_verified`, `intrust_merchant_approved`, `intrust_merchant_subscription_status`, `intrust_merchant_product_approved`, **`intrust_merchant_procurement_sale`**.
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
