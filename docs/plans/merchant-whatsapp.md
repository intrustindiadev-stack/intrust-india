> **Status:** Implemented

# Merchant WhatsApp Integration Plan

## Template Catalogue

The following templates are defined for the merchant WhatsApp integration. Note: All templates must be approved by Meta before they can be used in production.

| Template Name | Category | Variables | Event that fires it | Meta Approval Status |
|---|---|---|---|---|
| `intrust_merchant_new_order` | TRANSACTIONAL | 1: orderShortId, 2: amountRs, 3: itemCount | New Order Received | Pending |
| `intrust_merchant_order_cancelled` | TRANSACTIONAL | 1: orderShortId, 2: reason | Order Cancelled (Escalated to Admin) | Pending |
| `intrust_merchant_payout_status` | TRANSACTIONAL | 1: amountRs, 2: status, 3: note | Admin updates payout request status | Pending |
| `intrust_merchant_store_credit_request` | TRANSACTIONAL | 1: customerName, 2: amountRs, 3: item | Customer requests store credit / Udhar | Pending |
| `intrust_merchant_store_credit_paid` | TRANSACTIONAL | 1: amountRs, 2: item | Customer pays for store credit / Admin settles credit | Pending |
| `intrust_merchant_gift_card_sold` | TRANSACTIONAL | 1: amountRs, 2: brand | Customer purchases a gift card | Pending |
| `intrust_merchant_bank_verified` | TRANSACTIONAL | None | Admin approves merchant KYC / bank | Pending |
| `intrust_merchant_approved` | TRANSACTIONAL | 1: businessName, 2: nextStep | Admin approves merchant | Pending |
| `intrust_merchant_subscription_status`| TRANSACTIONAL | 1: status, 2: expiry | Merchant subscription activated/renewed via Sabpaisa or Wallet | Pending |
| `intrust_merchant_product_approved` | TRANSACTIONAL | 1: title, 2: decision, 3: reason | Admin approves/rejects a product | Pending |
| `intrust_merchant_welcome_linked` | TRANSACTIONAL | None | Phone number linked via OTP | Pending |

## Event -> Helper Mapping

| API Route | Fired Helper |
|---|---|
| `app/api/shopping/notify-order/route.js` | `notifyMerchantNewOrder` |
| `app/api/merchant/cannot-fulfill/route.js` | `notifyMerchantOrderCancelled` |
| `app/api/admin/payout-requests/[id]/route.js` | `notifyMerchantPayoutStatus` |
| `app/api/udhari/request/route.js` | `notifyMerchantStoreCreditRequest` |
| `app/api/udhari/pay/route.js` | `notifyMerchantStoreCreditPaid` |
| `app/api/shopping/settle-store-credit/route.js` | `notifyMerchantStoreCreditPaid` |
| `app/api/gift-cards/buy-wallet/route.js` | `notifyMerchantGiftCardSold` |
| `app/api/admin/verify-bank/route.js` | `notifyMerchantBankVerified` |
| `app/api/admin/approve-merchant/route.js` | `notifyMerchantApproved` |
| `app/api/admin/shopping/approve-product/route.js` | `notifyMerchantProductDecision` |
| `app/api/sabpaisa/callback/route.js` | `notifyMerchantSubscriptionStatus` |
| `app/api/payment/wallet-pay/route.js` | `notifyMerchantSubscriptionStatus` |

## Deduplication Strategy

To prevent spamming merchants and save costs, we enforce deduplication using the `whatsapp_message_logs` table matching on `content_preview` and `user_id`.
- **`new_order`**: 30-second deduplication window (high-frequency event).
- **All others**: 24-hour deduplication window (transactional/lifecycle events).

## Toggle Defaults

Merchant notification toggles exist in the `merchant_notification_settings` column as boolean fields. 
- **Transactional Toggles** (`whatsapp_order_alerts`, `whatsapp_kyc_alerts`, `whatsapp_subscription_alerts`, `whatsapp_payout_alerts`, `whatsapp_store_credit_alerts`, `whatsapp_product_alerts`): **Default TRUE**.
- **Marketing Toggles**: **Default FALSE**.

## Meta Approval Checklist

The following 11 new template names must be submitted and approved before going live:
- [ ] `intrust_merchant_new_order`
- [ ] `intrust_merchant_order_cancelled`
- [ ] `intrust_merchant_payout_status`
- [ ] `intrust_merchant_store_credit_request`
- [ ] `intrust_merchant_store_credit_paid`
- [ ] `intrust_merchant_gift_card_sold`
- [ ] `intrust_merchant_bank_verified`
- [ ] `intrust_merchant_approved`
- [ ] `intrust_merchant_subscription_status`
- [ ] `intrust_merchant_product_approved`
- [ ] `intrust_merchant_welcome_linked`

## Environment Variables

No new environment variables are required. The module reuses existing:
- `OMNIFLOW_BASE_URL`
- `OMNIFLOW_API_TOKEN`
