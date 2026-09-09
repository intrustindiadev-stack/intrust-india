'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import { 
  sendTemplateMessage,
  normalisePhone,
  AI_ORDER_ASSIGNED_TEMPLATE,
  MERCHANT_NEW_ORDER_TEMPLATE,
  MERCHANT_ORDER_CANCELLED_TEMPLATE,
  MERCHANT_PAYOUT_STATUS_TEMPLATE,
  MERCHANT_PAYOUT_REQUESTED_TEMPLATE,
  MERCHANT_STORE_CREDIT_REQUEST_TEMPLATE,
  MERCHANT_STORE_CREDIT_PAID_TEMPLATE,
  MERCHANT_GIFT_CARD_SOLD_TEMPLATE,
  MERCHANT_BANK_VERIFIED_TEMPLATE,
  MERCHANT_APPROVED_TEMPLATE,
  MERCHANT_SUBSCRIPTION_STATUS_TEMPLATE,
  MERCHANT_PRODUCT_APPROVED_TEMPLATE,
  MERCHANT_PROCUREMENT_SALE_TEMPLATE,
  MERCHANT_SUBSCRIPTION_EXPIRING_TEMPLATE,
  MERCHANT_PAYOUT_FAILED_TEMPLATE,
  INVESTMENT_MATURITY_TEMPLATE,
  MERCHANT_TRANSACTION_ALERT_TEMPLATE,
} from '@/lib/omniflow'
import crypto from 'crypto'

/**
 * Internal shared helper for dispatching merchant WhatsApp notifications.
 * Handles binding lookup, toggle check, deduplication, and logging.
 */
async function _dispatchMerchantWhatsApp({ 
  adminClient, 
  merchantUserId, 
  toggleKey, 
  template, 
  templateArgs, 
  dedupeTag, 
  dedupeWindowMs 
}) {
  try {
    // 1. Binding lookup
    const { data: binding } = await adminClient
      .from('user_channel_bindings')
      .select('phone')
      .eq('user_id', merchantUserId)
      .eq('audience', 'merchant')
      .eq('whatsapp_opt_in', true)
      .maybeSingle()

    if (!binding?.phone) return

    // 2. Toggle check
    const { data: merchantSettings } = await adminClient
      .from('merchant_notification_settings')
      .select(`${toggleKey}, merchants!inner(user_id)`)
      .eq('merchants.user_id', merchantUserId)
      .maybeSingle()

    // Note: Fail-open semantics. If row is missing, we treat as default-true (all transactional alerts on).
    if (merchantSettings && merchantSettings[toggleKey] === false) return

    // 2a. Master toggle check — explicit false short-circuits all sub-flags
    if (merchantSettings && merchantSettings.whatsapp_notifications === false) return

    // 3. Dedup guard — scoped to audience='merchant' to avoid cross-audience tag collisions
    if (dedupeTag) {
      const windowStart = new Date(Date.now() - dedupeWindowMs).toISOString()
      const { data: existingLog } = await adminClient
        .from('whatsapp_message_logs')
        .select('id')
        .eq('user_id', merchantUserId)
        .eq('content_preview', dedupeTag)
        .eq('audience', 'merchant')
        .gte('created_at', windowStart)
        .maybeSingle()

      if (existingLog) return
    }

    // 4. Send template
    const components = template.buildComponents(...templateArgs)
    const phoneHash = crypto.createHash('sha256').update(binding.phone).digest('hex')

    try {
      const res = await sendTemplateMessage(binding.phone, template.name, template.language, components)

      // 5. Log success
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: merchantUserId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'merchant',
        status: 'sent',
        wamid: res?.messageId ?? null,
        content_preview: dedupeTag
      })
    } catch (sendError) {
      // 2c. Log the send failure before re-throwing
      try {
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: merchantUserId,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          audience: 'merchant',
          status: 'failed',
          content_preview: '[FAILED] ' + dedupeTag + ' :: ' + sendError.message.slice(0, 150),
          error_code: sendError.code || null,
          error_detail: sendError.rawSnippet || sendError.message || null
        })
      } catch (logErr) {
        console.error('[merchantWhatsapp] Failed to write failure log:', logErr)
      }
      throw sendError
    }

  } catch (error) {
    console.error('[merchantWhatsapp] Dispatch failed:', error)
    // 2d. Best-effort failure log from outer catch
    try {
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: merchantUserId,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'merchant',
        status: 'failed',
        content_preview: '[FAILED] ' + (dedupeTag ?? error.message).slice(0, 200),
        error_code: error.code || null,
        error_detail: error.rawSnippet || error.message || null
      })
    } catch {
      // secondary DB failure — ignore to avoid masking original error
    }
  }
}

// Public Exports

export async function notifyMerchantNewOrder({ merchantUserId, orderShortId, amountRs, itemCount }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_order_alerts',
    template: MERCHANT_NEW_ORDER_TEMPLATE,
    templateArgs: [orderShortId, amountRs, itemCount],
    dedupeTag: `[template:intrust_merchant_new_order:${orderShortId}]`,
    dedupeWindowMs: 30 * 1000 // 30 seconds
  })
}

export async function notifyMerchantOrderCancelled({ merchantUserId, orderShortId, reason }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_order_alerts',
    template: MERCHANT_ORDER_CANCELLED_TEMPLATE,
    templateArgs: [orderShortId, reason],
    dedupeTag: `[template:intrust_merchant_order_cancelled:${orderShortId}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000 // 24 hours
  })
}

export async function notifyMerchantPayoutStatus({ merchantUserId, amountRs, status, note }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_payout_alerts',
    template: MERCHANT_PAYOUT_STATUS_TEMPLATE,
    templateArgs: [amountRs, status, note],
    dedupeTag: `[template:intrust_merchant_payout_status_v2:${merchantUserId}:${status}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantStoreCreditRequest({ merchantUserId, customerName, amountRs, item }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_store_credit_alerts',
    template: MERCHANT_STORE_CREDIT_REQUEST_TEMPLATE,
    templateArgs: [customerName, amountRs, item],
    dedupeTag: `[template:intrust_merchant_store_credit_request:${merchantUserId}:${item}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantStoreCreditPaid({ merchantUserId, amountRs, item }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_store_credit_alerts',
    template: MERCHANT_STORE_CREDIT_PAID_TEMPLATE,
    templateArgs: [amountRs, item],
    dedupeTag: `[template:intrust_merchant_store_credit_paid:${merchantUserId}:${item}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantGiftCardSold({ merchantUserId, amountRs, brand }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_order_alerts',
    template: MERCHANT_GIFT_CARD_SOLD_TEMPLATE,
    templateArgs: [amountRs, brand],
    dedupeTag: `[template:intrust_merchant_gift_card_sold:${merchantUserId}:${brand}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantBankVerified({ merchantUserId }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_kyc_alerts',
    template: MERCHANT_BANK_VERIFIED_TEMPLATE,
    templateArgs: [],
    dedupeTag: `[template:intrust_merchant_bank_verified:${merchantUserId}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantApproved({ merchantUserId, businessName, nextStep }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_kyc_alerts',
    template: MERCHANT_APPROVED_TEMPLATE,
    templateArgs: [businessName, nextStep],
    dedupeTag: `[template:intrust_merchant_approved:${merchantUserId}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantSubscriptionStatus({ merchantUserId, status, expiry }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_subscription_alerts',
    template: MERCHANT_SUBSCRIPTION_STATUS_TEMPLATE,
    templateArgs: [status, expiry],
    dedupeTag: `[template:intrust_merchant_subscription_status:${merchantUserId}:${status}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantProductDecision({ merchantUserId, title, decision, reason }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_product_alerts',
    template: MERCHANT_PRODUCT_APPROVED_TEMPLATE,
    templateArgs: [title, decision, reason],
    dedupeTag: `[template:intrust_merchant_product_approved:${merchantUserId}:${title}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

export async function notifyMerchantPayoutRequested({ merchantUserId, amountRs, source }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_payout_alerts',
    template: MERCHANT_PAYOUT_REQUESTED_TEMPLATE,
    templateArgs: [amountRs, source],
    dedupeTag: `[template:intrust_merchant_payout_requested:${merchantUserId}:${Date.now()}]`,
    dedupeWindowMs: 30 * 1000 // 30-second window allows retries without duplicate sends
  })
}

/**
 * Notify a merchant that the InTrust platform has procured (purchased) stock
 * from their inventory and credited their wallet.
 *
 * Uses MERCHANT_PROCUREMENT_SALE_TEMPLATE (`intrust_merchant_procurement_sale`,
 * en_US).  The template must be registered and approved with Meta/Omniflow
 * before sends succeed; unapproved sends fail silently (this call is
 * fire-and-forget in the procure route).
 *
 * Toggle: `whatsapp_sale_notifications` on `merchant_notification_settings`.
 * Fail-open — if the column or row is missing the notification is sent by
 * default (consistent with other transactional alerts).
 *
 * @param {object} opts
 * @param {string} opts.merchantUserId  - auth user_id of the merchant
 * @param {string} opts.amountRs        - formatted amount string e.g. "250.00"
 * @param {number} opts.itemCount       - total units procured
 * @param {string} opts.procurementId   - UUID of the platform_procurement_orders row
 *
 * @requires Template `intrust_merchant_procurement_sale` approved in Meta/Omniflow.
 *   Variables: {{1}} = procurement short-id, {{2}} = amount (₹), {{3}} = item count.
 */
export async function notifyMerchantProcurementSale({ merchantUserId, amountRs, itemCount, procurementId }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    toggleKey: 'whatsapp_sale_notifications',
    template: MERCHANT_PROCUREMENT_SALE_TEMPLATE,
    templateArgs: [procurementId.slice(0, 8).toUpperCase(), amountRs, itemCount],
    dedupeTag: `[template:intrust_merchant_procurement_sale:${procurementId}]`,
    dedupeWindowMs: 30 * 1000 // 30-second dedup window
  })
}

// ── NEW UTILITY HELPERS ──────────────────────────────────────────────────────

export async function notifyMerchantSubscriptionExpiring({ merchantUserId, businessName, expiryDate }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    template: MERCHANT_SUBSCRIPTION_EXPIRING_TEMPLATE,
    templateArgs: [String(businessName), String(expiryDate)],
    toggleKey: 'security_alerts'
  })
}

export async function notifyMerchantPayoutFailed({ merchantUserId, amountRs, reason }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    template: MERCHANT_PAYOUT_FAILED_TEMPLATE,
    templateArgs: [String(amountRs), String(reason)],
    toggleKey: 'transaction_alerts'
  })
}

export async function notifyMerchantInvestmentMaturity({ merchantUserId, investmentType, amountRs, maturityDate }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    template: INVESTMENT_MATURITY_TEMPLATE,
    templateArgs: [String(investmentType), String(amountRs), String(maturityDate)],
    toggleKey: 'transaction_alerts'
  })
}

export async function notifyMerchantTransaction({ merchantUserId, amountRs, direction, newBalanceRs, source, dedupeId }) {
  const adminClient = createAdminClient()
  return _dispatchMerchantWhatsApp({
    adminClient,
    merchantUserId,
    template: MERCHANT_TRANSACTION_ALERT_TEMPLATE,
    templateArgs: [String(amountRs), String(direction), String(newBalanceRs), String(source)],
    toggleKey: 'whatsapp_transaction_alerts',
    dedupeTag: `[template:intrust_merchant_transaction_alert:${dedupeId}]`,
    dedupeWindowMs: 30 * 1000 // 30-second dedup window
  })
}

/**
 * Dispatch an additive WhatsApp notification to a merchant when an AI Order
 * is assigned to their account.
 * 
 * Strict targeting rules:
 * - Recipient phone MUST be resolved server-side from canonical merchant data.
 * - Only sent if merchantUserId is valid and assigned.
 * - Idempotency guard prevents duplicate notifications for the same order assignment.
 * - Non-blocking: OmniFlow or delivery failures NEVER interrupt the AI Order flow.
 *
 * @param {object} params
 * @param {string} params.orderId - UUID of the AI Order
 * @param {string} params.merchantUserId - Auth user UUID of the assigned merchant
 * @param {string} [params.orderCode] - Canonical order code (e.g., 'AI-1028')
 * @param {number} params.wholesalePricePaise - Wholesale / principal amount in paise
 * @param {number} params.profitMarginPaise - Expected profit in paise
 * @param {object} [params.adminClientOverride] - Optional injected admin client (useful for tests)
 * @returns {Promise<{ success: boolean, messageId?: string, skipped?: boolean, reason?: string, error?: string }>}
 */
export async function notifyMerchantAiOrderAssigned({
  orderId,
  merchantUserId,
  orderCode,
  wholesalePricePaise,
  profitMarginPaise,
  adminClientOverride = null
}) {
  if (!orderId || !merchantUserId) {
    console.warn('[merchantWhatsapp] notifyMerchantAiOrderAssigned skipped: missing orderId or merchantUserId.');
    return { success: false, reason: 'UNASSIGNED' };
  }

  const adminClient = adminClientOverride || createAdminClient();

  try {
    // 1. Idempotency guard: verify this AI Order assignment was not already notified
    const dedupeTag = `[template:intrust_ai_order_assigned:${orderId}]`;
    const { data: existingLog } = await adminClient
      .from('whatsapp_message_logs')
      .select('id')
      .eq('user_id', merchantUserId)
      .eq('content_preview', dedupeTag)
      .eq('status', 'sent')
      .maybeSingle();

    if (existingLog) {
      return { success: true, skipped: true, reason: 'ALREADY_SENT' };
    }

    // 2. Canonical server-side phone & merchant identity resolution
    // 2a. Check user_channel_bindings first
    const { data: binding } = await adminClient
      .from('user_channel_bindings')
      .select('phone, whatsapp_opt_in')
      .eq('user_id', merchantUserId)
      .eq('audience', 'merchant')
      .maybeSingle();

    // 2b. Check merchants table
    const { data: merchantRow } = await adminClient
      .from('merchants')
      .select('id, business_name, business_phone')
      .eq('user_id', merchantUserId)
      .maybeSingle();

    // 2c. Check user_profiles table as fallback
    const { data: profileRow } = await adminClient
      .from('user_profiles')
      .select('id, full_name, phone')
      .eq('id', merchantUserId)
      .maybeSingle();

    // Resolve raw phone
    const rawPhone = binding?.phone || merchantRow?.business_phone || profileRow?.phone;
    if (!rawPhone) {
      console.warn(`[merchantWhatsapp] No phone number found for merchant ${merchantUserId}. Notification skipped.`);
      return { success: false, reason: 'NO_PHONE' };
    }

    // Normalise phone via OmniFlow utility
    let normalisedPhone;
    try {
      normalisedPhone = normalisePhone(rawPhone);
    } catch (normErr) {
      console.warn(`[merchantWhatsapp] Invalid phone format for merchant ${merchantUserId} (${rawPhone}):`, normErr.message);
      return { success: false, reason: 'INVALID_PHONE' };
    }

    // Resolve merchant name
    const merchantName = (merchantRow?.business_name || profileRow?.full_name || 'Merchant').trim();

    // 3. Opt-out checks
    if (binding && binding.whatsapp_opt_in === false) {
      return { success: false, reason: 'OPTED_OUT' };
    }

    const { data: merchantSettings } = await adminClient
      .from('merchant_notification_settings')
      .select('whatsapp_notifications, merchants!inner(user_id)')
      .eq('merchants.user_id', merchantUserId)
      .maybeSingle();

    if (merchantSettings && merchantSettings.whatsapp_notifications === false) {
      return { success: false, reason: 'OPTED_OUT' };
    }

    // 4. Format authoritative variables
    const formattedOrderCode = orderCode || `AI-${orderId.slice(0, 4).toUpperCase()}`;
    const wholesaleRs = (Number(wholesalePricePaise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    const profitRs = (Number(profitMarginPaise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    const components = AI_ORDER_ASSIGNED_TEMPLATE.buildComponents(
      merchantName,
      formattedOrderCode,
      wholesaleRs,
      profitRs,
      orderId
    );

    const phoneHash = crypto.createHash('sha256').update(normalisedPhone).digest('hex');

    // 5. Outbound send via OmniFlow
    try {
      const res = await sendTemplateMessage(
        normalisedPhone,
        AI_ORDER_ASSIGNED_TEMPLATE.name,
        AI_ORDER_ASSIGNED_TEMPLATE.language,
        components
      );

      // 6. Audit log on success
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: merchantUserId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'merchant',
        status: 'sent',
        wamid: res?.messageId ?? null,
        content_preview: dedupeTag,
        template_name: AI_ORDER_ASSIGNED_TEMPLATE.name,
        template_language: AI_ORDER_ASSIGNED_TEMPLATE.language
      });

      return { success: true, messageId: res?.messageId };
    } catch (sendError) {
      // 7. Audit log on send failure (isolated from caller)
      try {
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: merchantUserId,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          audience: 'merchant',
          status: 'failed',
          content_preview: `[FAILED] ${dedupeTag} :: ${(sendError.message || '').slice(0, 150)}`,
          error_code: sendError.code || 'OMNIFLOW_ERROR',
          error_detail: sendError.rawSnippet || sendError.message || null,
          template_name: AI_ORDER_ASSIGNED_TEMPLATE.name,
          template_language: AI_ORDER_ASSIGNED_TEMPLATE.language
        });
      } catch (logErr) {
        console.error('[merchantWhatsapp] Failed to record WhatsApp failure audit log:', logErr);
      }

      console.warn(`[merchantWhatsapp] WhatsApp send failed for AI order ${orderId} (non-blocking):`, sendError.message);
      return { success: false, error: sendError.message };
    }
  } catch (error) {
    console.error(`[merchantWhatsapp] Unexpected error in notifyMerchantAiOrderAssigned (non-blocking):`, error);
    return { success: false, error: error.message };
  }
}

