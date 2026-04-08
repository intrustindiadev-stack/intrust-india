# Payment Redirect Fix - Merchant Dashboard

## Overview
Fixed the payment callback system to redirect merchants directly to their dashboard after successful payment, instead of showing a generic success page.

## Problem
After completing payment (subscription, wallet topup, or wholesale purchase), merchants were redirected to a generic `/payment/success` page, which then waited 5 seconds before redirecting to the dashboard. This created a poor user experience with unnecessary delays.

## Solution
Modified both payment callback handlers to intelligently redirect users based on:
1. **Payment status** (SUCCESS, PENDING, FAILED, ABORTED, TIMEOUT)
2. **Transaction type** (merchant vs customer transactions)
3. **Specific merchant transaction types** (subscription, topup, wholesale)

## Files Modified

### 1. `app/api/sabpaisa/callback/route.js` (Primary Callback Handler)
**Lines 687-720**: Enhanced redirect logic with merchant-specific routing

**Changes:**
- **MERCHANT_SUBSCRIPTION** → `/merchant/dashboard?welcome=true&txnId={id}`
- **MERCHANT_TOPUP** → `/merchant/wallet?success=true&txnId={id}`
- **WHOLESALE_PURCHASE** → `/merchant/inventory?success=true&txnId={id}`
- **Customer transactions** → `/payment/success?txnId={id}` (unchanged)
- **PENDING status** → `/payment/processing?txnId={id}`
- **FAILED/ABORTED** → `/payment/failure?txnId={id}&msg={error}`
- **TIMEOUT/Unknown** → `/payment/processing?txnId={id}&status=timeout`

### 2. `pages/api/payment/callback.js` (Legacy Callback Handler)
**Lines 261-278**: Applied same redirect logic for backward compatibility

**Note:** This handler is deprecated but maintained for in-flight transactions.

## Edge Cases Handled

### ✅ Failed Payments
- Redirects to `/payment/failure` with error message
- Preserves transaction ID for support/debugging
- Shows user-friendly error message from payment gateway

### ✅ Timeout/Unknown Status
- Redirects to `/payment/processing` with timeout indicator
- Allows user to check status or retry
- Prevents confusion from ambiguous states

### ✅ Pending Payments
- Redirects to `/payment/processing` page
- Shows loading state while payment is being confirmed
- Prevents premature success/failure messaging

### ✅ Duplicate Callbacks
- Idempotency checks prevent double-processing
- Existing `wasAlreadySuccess` flag prevents duplicate wallet credits
- Transaction status updates are atomic

### ✅ Fulfillment Failures
- If payment succeeds but fulfillment fails (e.g., wallet credit error)
- Status is downgraded to FAILED
- User is informed payment will be refunded
- Prevents charging without delivering service

## Query Parameters

### Success Redirects
- `welcome=true` - Indicates first-time merchant activation
- `success=true` - Indicates successful transaction completion
- `txnId={id}` - Transaction reference for verification

### Failure Redirects
- `msg={error}` - Error message from payment gateway
- `reason={code}` - System error code (e.g., `decryption_failed`, `internal_error`)

### Processing Redirects
- `status=timeout` - Indicates payment timeout scenario

## Transaction Types Supported

### Merchant Transactions
1. **MERCHANT_SUBSCRIPTION** - Monthly subscription payment (₹149)
2. **MERCHANT_TOPUP** - Merchant wallet recharge
3. **WHOLESALE_PURCHASE** - Bulk inventory purchase

### Customer Transactions
1. **WALLET_TOPUP** - Customer wallet recharge
2. **GIFT_CARD** - Gift card purchase
3. **GOLD_SUBSCRIPTION** - Premium membership
4. **CART_CHECKOUT** - Shopping cart payment
5. **UDHARI_PAYMENT** - Store credit settlement

## Testing Checklist

- [ ] Merchant subscription payment → redirects to `/merchant/dashboard?welcome=true`
- [ ] Merchant wallet topup → redirects to `/merchant/wallet?success=true`
- [ ] Wholesale purchase → redirects to `/merchant/inventory?success=true`
- [ ] Customer wallet topup → redirects to `/payment/success`
- [ ] Failed payment → redirects to `/payment/failure` with error
- [ ] Pending payment → redirects to `/payment/processing`
- [ ] Payment timeout → redirects to `/payment/processing?status=timeout`
- [ ] Duplicate callback → doesn't double-credit wallet
- [ ] Fulfillment failure → marks payment as failed

## Benefits

### 🚀 Improved User Experience
- **Instant access** to merchant dashboard after payment
- **No unnecessary delays** or intermediate pages
- **Context-aware redirects** based on transaction type

### 🎯 Better Conversion
- Merchants can immediately start using their account
- Reduces drop-off from confusion or delays
- Clear success indicators with query parameters

### 🛡️ Robust Error Handling
- All payment states properly handled
- Clear error messages for failed payments
- Timeout scenarios don't leave users stuck

### 📊 Better Analytics
- Query parameters enable tracking of payment sources
- Can measure time-to-first-action after payment
- Distinguish between new activations and renewals

## Backward Compatibility

- Legacy callback handler updated with same logic
- Existing customer payment flows unchanged
- Query parameters are optional (pages work without them)
- No breaking changes to existing integrations

## Future Enhancements

1. **Welcome Tour**: Use `welcome=true` to trigger onboarding flow
2. **Success Notifications**: Show toast/banner based on `success=true`
3. **Analytics Events**: Track conversion funnel completion
4. **A/B Testing**: Test different post-payment experiences

## Related Files

- `pages/payment/success.jsx` - Generic success page (still used for customers)
- `lib/sabpaisa/utils.js` - Status mapping utilities
- `lib/supabase/queries.js` - Transaction update functions
- `database_scripts/sabpaisa_schema.sql` - Transaction schema

## Support

If merchants report not being redirected properly:
1. Check transaction logs for callback receipt
2. Verify `udf1` field contains correct transaction type
3. Check for JavaScript errors preventing redirect
4. Verify merchant dashboard route is accessible
5. Check for middleware blocking the redirect

---

**Last Updated:** April 8, 2026  
**Author:** Development Team  
**Status:** ✅ Implemented & Ready for Testing
