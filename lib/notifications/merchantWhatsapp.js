'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import { 
  sendTemplateMessage,
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
  MERCHANT_PRODUCT_APPROVED_TEMPLATE
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
      await sendTemplateMessage(binding.phone, template.name, template.language, components)

      // 5. Log success
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: merchantUserId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'merchant',
        status: 'delivered',
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
          content_preview: '[FAILED] ' + dedupeTag + ' :: ' + sendError.message.slice(0, 150)
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
        content_preview: '[FAILED] ' + (dedupeTag ?? error.message).slice(0, 200)
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
    dedupeTag: `[template:intrust_merchant_payout_status:${merchantUserId}:${status}]`,
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
