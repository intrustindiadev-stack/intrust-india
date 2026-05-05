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
```

---

## Step 3: Register the Omniflow Webhook

In the Omniflow dashboard → Settings → Webhooks, register:

```
https://intrustindia.com/api/webhooks/omniflow
```

This endpoint receives inbound WhatsApp messages and handles OTP verification.

---

## Step 4: Create the OTP Verification Template

1. In Omniflow → Templates → Create New
2. Fill in:
   - Name: intrust_otp_verification
   - Category: Authentication
   - Language: English (en)
   - Body: Your InTrust verification code is: {{1}}. This code will expire in 10 minutes. Do not share it with anyone.
   - Variables: {{1}} = OTP code (6 digits)
3. Submit → wait 24–48 hours for Meta approval
4. Verify approval: GET https://intrustindia.com/api/admin/whatsapp-health
   (with Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>)
   Response should show: otp_template.approved = true
