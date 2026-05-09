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
   Response should show: templates.approved = true

---

## Step 5: Merchant Templates

These templates are designed for a premium merchant experience. Create them in the Omniflow dashboard under the **Utility** category with **English (en)** language.

> [!NOTE]
> When creating these in the dashboard, ensure you add the **Footer** and **Buttons** exactly as specified.

---

### 1. `intrust_merchant_welcome_linked`
**Purpose**: Sent immediately after a merchant links their phone.

- **Body**:
  ```text
  🤝 *Welcome to InTrust India Merchant Services*

  Your WhatsApp has been successfully linked. You will now receive real-time business alerts and transaction notifications directly here.

  *You'll stay updated on:*
  • New Order Alerts 🛍️
  • Payout & Settlement Status 💸
  • Store Credit Requests 📝
  • Security & Account Updates 🔐

  We're excited to have you onboard!
  ```
- **Footer**: InTrust India | Merchant Partner
- **Buttons**:
  - [Quick Reply] `View Dashboard`
  - [Quick Reply] `My Balance`

### 2. `intrust_merchant_new_order`
**Purpose**: Real-time notification for a new sale.

- **Body**:
  ```text
  🛍️ *New Order Received!*

  A new order has been placed at your store.

  *Order ID*: {{1}}
  *Total Amount*: ₹{{2}}
  *Items Count*: {{3}}

  Please review the order details and begin processing to ensure timely delivery.
  ```
- **Variables**: {{1}} = Order ID (e.g. #ORD-123), {{2}} = Amount (e.g. 1,250.00), {{3}} = Total Items
- **Footer**: InTrust India | Order Management
- **Buttons**:
  - [Quick Reply] `View Order Details`
  - [Quick Reply] `Manage Orders`

### 3. `intrust_merchant_order_cancelled`
**Purpose**: Alert for cancelled orders.

- **Body**:
  ```text
  ❌ *Order Cancellation Alert*

  The following order has been cancelled:

  *Order ID*: {{1}}
  *Reason*: {{2}}

  No further action is required for this order. If items were already packed, please return them to inventory.
  ```
- **Variables**: {{1}} = Order ID, {{2}} = Cancellation Reason
- **Footer**: InTrust India | Inventory Update
- **Buttons**:
  - [Quick Reply] `View Order`
  - [Quick Reply] `Contact Support`

### 4. `intrust_merchant_payout_status`
**Purpose**: Confirmation of funds being sent to the merchant.

- **Body**:
  ```text
  💸 *Payout Processed Successfully*

  Your settlement has been initiated.

  *Amount*: ₹{{1}}
  *Status*: *{{2}}*
  *Reference*: {{3}}

  Funds usually reflect in your registered bank account within 24-48 hours.
  ```
- **Variables**: {{1}} = Amount, {{2}} = Payout Status, {{3}} = Ref/Note
- **Footer**: InTrust India | Secure Settlements
- **Buttons**:
  - [Quick Reply] `Settlement History`
  - [Quick Reply] `My Bank Details`

### 5. `intrust_merchant_store_credit_request`
**Purpose**: Notification for manual store credit approvals.

- **Body**:
  ```text
  📝 *New Store Credit Request*

  A customer has requested to use store credit for a purchase.

  *Customer*: {{1}}
  *Amount*: ₹{{2}}
  *Item/Order*: {{3}}

  Please approve or decline this request from your merchant panel.
  ```
- **Variables**: {{1}} = Customer Name, {{2}} = Credit Amount, {{3}} = Item Description
- **Footer**: InTrust India | Credit Management
- **Buttons**:
  - [Quick Reply] `Review Request`
  - [Quick Reply] `View All Requests`

### 6. `intrust_merchant_store_credit_paid`
**Purpose**: Settlement confirmation for store credit items.

- **Body**:
  ```text
  ✅ *Store Credit Settlement Confirmed*

  The credit for the following item has been successfully settled to your balance.

  *Amount*: ₹{{1}}
  *Item*: {{2}}

  Thank you for supporting our store credit program.
  ```
- **Variables**: {{1}} = Amount, {{2}} = Item Name
- **Footer**: InTrust India | Ledger Update
- **Buttons**:
  - [Quick Reply] `View Ledger`
  - [Quick Reply] `Recent Credits`

### 7. `intrust_merchant_gift_card_sold`
**Purpose**: Notification of gift card revenue.

- **Body**:
  ```text
  🎁 *Gift Card Sold!*

  A new digital gift card has been purchased from your brand.

  *Revenue*: ₹{{1}}
  *Brand*: {{2}}

  The funds have been added to your merchant wallet.
  ```
- **Variables**: {{1}} = Sale Amount, {{2}} = Brand Name
- **Footer**: InTrust India | Voucher Sales
- **Buttons**:
  - [Quick Reply] `View Sales Report`
  - [Quick Reply] `My Wallet`

### 8. `intrust_merchant_bank_verified`
**Purpose**: Confirmation of KYC/Banking setup.

- **Body**:
  ```text
  🏦 *Bank Verification Successful*

  Your bank account details have been verified by our compliance team.

  You are now eligible to receive automated payouts directly to this account.
  ```
- **Variables**: (none)
- **Footer**: InTrust India | Compliance Verified
- **Buttons**:
  - [Quick Reply] `View Bank Details`
  - [Quick Reply] `Profile Settings`

### 9. `intrust_merchant_approved`
**Purpose**: Official onboarding welcome.

- **Body**:
  ```text
  🎉 *Congratulations! Your Account is Approved*

  Welcome to the InTrust India Merchant family, *{{1}}*!

  Your digital storefront is now live.
  *Next Step*: {{2}}

  We look forward to helping your business grow.
  ```
- **Variables**: {{1}} = Business Name, {{2}} = Next Action
- **Footer**: InTrust India | Business Growth
- **Buttons**:
  - [Quick Reply] `Start Selling`
  - [Quick Reply] `Tutorial Guide`

### 10. `intrust_merchant_subscription_status`
**Purpose**: Alerts for plan expiry or changes.

- **Body**:
  ```text
  📅 *Merchant Subscription Update*

  Your current plan status has been updated.

  *Status*: *{{1}}*
  *Renewal/Expiry*: {{2}}

  Maintain an active subscription to ensure uninterrupted access to premium features.
  ```
- **Variables**: {{1}} = Plan Status (e.g. Active/Expiring Soon), {{2}} = Date
- **Footer**: InTrust India | Subscription Services
- **Buttons**:
  - [Quick Reply] `Renew Now`
  - [Quick Reply] `Compare Plans`

### 11. `intrust_merchant_product_approved`
**Purpose**: Catalog update notifications.

- **Body**:
  ```text
  📦 *Product Catalog Update*

  Our review team has finished auditing your product submission.

  *Product*: {{1}}
  *Decision*: *{{2}}*
  *Note*: {{3}}

  Thank you for maintaining our quality standards.
  ```
- **Variables**: {{1}} = Product Title, {{2}} = Approved/Rejected, {{3}} = Feedback Note
- **Footer**: InTrust India | Quality Assurance
- **Buttons**:
  - [Quick Reply] `View Product`
  - [Quick Reply] `Edit Catalog`

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
