> **Status:** CURRENT — All flows route through /payment/success first. See ticket:b33ec303-9dfc-4554-a21e-5731ae4f40d1/74a166f1-b4f6-46ec-a38d-593ff7940254

# Payment Redirect Fix — Merchant Dashboard

## What's Changed
- Every `gateway_success` outcome (merchant and customer) now redirects to `/payment/success?txnId=…` first.
- The per-`udf1` merchant direct-redirect branches (`/merchant/dashboard`, `/merchant/wallet`, `/merchant/inventory`) have been removed from the callback.
- The success page's `getConfig` map (in `file:pages/payment/success.jsx`) is the single source of truth for per-flow ACK copy and auto-redirect destination.
- Session-dropped clients no longer bounce to `/login`; they see the success ACK inferred from the `txnId` prefix.

## Overview
Fixed the payment callback system to redirect merchants directly to their dashboard after successful payment, instead of showing a generic success page.

## Problem
After completing payment (subscription, wallet topup, wholesale purchase, Lockin funding, or AI Grow requests), merchants were redirected to a generic `/payment/success` page, which either showed the wrong copy or fell back to the customer dashboard link. `MERCHANT_LOCKIN` and `MERCHANT_AIGROW` were completely unhandled in the success page routing.

## Solution
Modified both payment callback handlers to intelligently redirect users based on:
1. **Payment status** (SUCCESS, PENDING, FAILED, ABORTED, TIMEOUT)
2. **Transaction type** (merchant vs customer transactions)
3. **Specific merchant transaction types** (subscription, topup, wholesale, lockin, aigrow)

## Files Modified

### 1. `pages/payment/success.jsx` (Success Page Config)
**`getConfig()`** — extended with two new branches:
- **MERCHANT_LOCKIN** (`LKN_` prefix) → `/merchant/dashboard?tab=lockin`, "Growth Portfolio Funded 📈"
- **MERCHANT_AIGROW** (`AIG_` prefix) → `/merchant/dashboard?tab=aigrow`, "AI Grow Request Submitted 🤖"

**Sessionless prefix inference** — extended with:
- `LKN_` → `MERCHANT_LOCKIN`
- `AIG_` → `MERCHANT_AIGROW`

### 2. `app/api/sabpaisa/callback/route.js` (Primary Callback Handler)
All payment types redirect to `/payment/success?txnId={id}` on success. The success page then handles per-flow ACK copy and destination.

## Redirect Mapping

| udf1 / txnId prefix | Success destination | Copy |
|---|---|---|
| `MERCHANT_SUBSCRIPTION` / `MSUB_` | `/merchant/dashboard?welcome=true` | Store Activated 🎉 |
| `MERCHANT_TOPUP` | `/merchant/wallet` (via default) | Payment Successful |
| `WHOLESALE_PURCHASE` | `/merchant/inventory` (via default) | Payment Successful |
| `MERCHANT_LOCKIN` / `LKN_` | `/merchant/lockin` | Growth Portfolio Funded 📈 |
| `MERCHANT_AIGROW` / `AIG_` | `/merchant/investments` | AI Grow Request Submitted 🤖 |
| `GOLD_SUBSCRIPTION` / `GOLD_` | dashboardLink | Elite Gold Activated ⭐ |
| `GIFT_CARD` / `GC_` | `/my-giftcards` or `/merchant/inventory` | Gift Card Secured 💳 |
| `CART_CHECKOUT` / `CART_` | `/orders?success=true` | Order Placed 🛍️ |
| `UDHARI_PAYMENT` / `UDR_` | dashboardLink | Store Credit Paid ✅ |
| `WALLET_TOPUP` / `WLT_` | `/wallet` or `/merchant/wallet` | Payment Successful ✅ |
| `NFC_ORDER` / `NFC_` | dashboardLink | Payment Successful ✅ |

## Edge Cases Handled

### ✅ Failed Payments
- Redirects to `/payment/failure` with error message
- Preserves transaction ID for support/debugging
- Shows user-friendly error message from payment gateway

### ✅ Timeout/Unknown Status
- Redirects to `/payment/processing` with timeout indicator

### ✅ Pending Payments
- Redirects to `/payment/processing` page

### ✅ Duplicate Callbacks / Crashed Mid-Fulfillment
- `fulfilled_at` column gates idempotency — a prior attempt that wrote `gateway_success` but crashed before fulfillment completes will be retried on the next callback/webhook, avoiding permanently stranded orders.

### ✅ Session-Dropped Clients
- `txnId` prefix inference infers `udf1` without a DB query, allowing the success page to render the correct ACK and redirect even when the user's Supabase session has expired.

## Query Parameters

### Success Redirects
- `txnId={id}` — transaction reference for verification

### Failure Redirects
- `msg={error}` — error message from payment gateway
- `reason={code}` — system error code (e.g. `decryption_failed`, `internal_error`)

### Processing Redirects
- `status=timeout` — indicates payment timeout scenario

## Transaction Types Supported

### Merchant Transactions
1. **MERCHANT_SUBSCRIPTION** — Monthly subscription payment
2. **MERCHANT_TOPUP** — Merchant wallet recharge
3. **WHOLESALE_PURCHASE** — Bulk inventory purchase
4. **MERCHANT_LOCKIN** — Growth portfolio funding (Lockin product)
5. **MERCHANT_AIGROW** — AI Grow investment request

### Customer Transactions
1. **WALLET_TOPUP** — Customer wallet recharge
2. **GIFT_CARD** — Gift card purchase
3. **GOLD_SUBSCRIPTION** — Premium membership
4. **CART_CHECKOUT** — Shopping cart payment
5. **UDHARI_PAYMENT** — Store credit settlement
6. **NFC_ORDER** — NFC card order

## Testing Checklist

- [ ] Merchant subscription → `/payment/success?txnId=MSUB_...` → auto-redirect `/merchant/dashboard?welcome=true`
- [ ] Merchant wallet topup → `/payment/success?txnId=WLT_...` → auto-redirect `/merchant/wallet`
- [ ] Wholesale purchase → `/payment/success?txnId=WLS_...` → generic success, `/merchant/inventory`
- [ ] **Merchant Lockin** → `/payment/success?txnId=LKN_...` → "Growth Portfolio Funded 📈" card → `/merchant/lockin`
- [ ] **Merchant AI Grow** → `/payment/success?txnId=AIG_...` → "AI Grow Request Submitted 🤖" card → `/merchant/investments`
- [ ] Customer wallet topup → `/payment/success?txnId=WLT_...` → `/wallet`
- [ ] Failed payment → `/payment/failure` with error
- [ ] Pending payment → `/payment/processing`
- [ ] Duplicate callback (fulfilled_at already set) → no double-credit, idempotent ACK
- [ ] Session-dropped: load `/payment/success?txnId=LKN_xxx` without auth → correct Lockin card → redirects to `/merchant/lockin`

## Related Files

- `pages/payment/success.jsx` — success page config and display
- `app/api/sabpaisa/callback/route.js` — browser-redirect callback handler
- `app/api/sabpaisa/webhook/route.js` — server-to-server webhook handler
- `lib/sabpaisa/fulfillment.js` — shared fulfillment logic
- `lib/sabpaisa/utils.js` — status mapping utilities
- `lib/supabase/queries.js` — transaction update functions
- `supabase/migrations/20260703_add_fulfilled_at_to_transactions.sql` — `fulfilled_at` + `expected_amount_paise` columns

## Support

If merchants report not being redirected properly after Lockin or AI Grow payment:
1. Check `transactions` table for `status = 'gateway_success'` and `fulfilled_at IS NOT NULL`
2. Verify `udf1` field contains `MERCHANT_LOCKIN` or `MERCHANT_AIGROW`
3. Check for `txnId` prefix match (`LKN_` / `AIG_`) in the browser URL
4. Confirm session state — if session expired, prefix-based inference handles the redirect
5. Check for JavaScript errors preventing redirect

---

**Last Updated:** July 3, 2026  
**Author:** Development Team  
**Status:** ✅ Implemented & Ready for Testing
