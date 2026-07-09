'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import {
  sendTemplateMessage,
  REWARD_MILESTONE_TEMPLATE,
  REFERRAL_INVITE_TEMPLATE,
  GIFTCARD_PROMO_TEMPLATE,
  WINBACK_TEMPLATE,
  FEATURE_ANNOUNCE_TEMPLATE,
  FESTIVAL_GREETING_TEMPLATE,
} from '@/lib/omniflow'
import crypto from 'crypto'

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CUSTOMER MARKETING DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal shared helper for dispatching customer marketing WhatsApp messages.
 *
 * Consent gate (both required — enforced in a single DB query):
 *   whatsapp_opt_in           = true  (master transactional opt-in)
 *   whatsapp_marketing_opt_in = true  (explicit marketing consent)
 *
 * No separate settings table exists for customers (unlike merchant_notification_settings).
 * Both flags live on user_channel_bindings.
 *
 * @param {object} opts
 * @param {*}      opts.adminClient     - Supabase admin client
 * @param {string} opts.customerUserId  - auth user_id of the customer
 * @param {object} opts.template        - Template object from omniflow.js
 * @param {Array}  opts.templateArgs    - Positional args passed to template.buildComponents()
 * @param {string} opts.dedupeTag       - Unique string used to deduplicate sends
 * @param {number} opts.dedupeWindowMs  - How far back to look for duplicate sends (ms)
 */
async function _dispatchCustomerMarketingWhatsApp({
  adminClient,
  customerUserId,
  template,
  templateArgs,
  dedupeTag,
  dedupeWindowMs,
}) {
  try {
    // 1. Binding lookup + dual consent gate (single query)
    const { data: binding } = await adminClient
      .from('user_channel_bindings')
      .select('phone')
      .eq('user_id', customerUserId)
      .eq('audience', 'customer')
      .eq('whatsapp_opt_in', true)
      .eq('whatsapp_marketing_opt_in', true)
      .maybeSingle()

    if (!binding?.phone) return { skipped: true }

    // 2. Dedupe guard — scoped to audience='customer' to avoid cross-audience collisions
    if (dedupeTag) {
      const windowStart = new Date(Date.now() - dedupeWindowMs).toISOString()
      const { data: existingLog } = await adminClient
        .from('whatsapp_message_logs')
        .select('id')
        .eq('user_id', customerUserId)
        .eq('content_preview', dedupeTag)
        .eq('audience', 'customer')
        .gte('created_at', windowStart)
        .maybeSingle()

      if (existingLog) return { skipped: true }
    }

    // 3. Build components and send
    const components = template.buildComponents(...templateArgs)
    const phoneHash = crypto.createHash('sha256').update(binding.phone).digest('hex')

    try {
      const res = await sendTemplateMessage(
        binding.phone,
        template.name,
        template.language,
        components,
      )

      // 4. Log success
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: customerUserId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'customer',
        status: 'sent',
        wamid: res?.messageId ?? null,
        content_preview: dedupeTag,
      })
      
      return { sent: true }
    } catch (sendError) {
      // Log send failure before surfacing
      try {
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: customerUserId,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          audience: 'customer',
          status: 'failed',
          content_preview: '[FAILED] ' + dedupeTag + ' :: ' + sendError.message.slice(0, 150),
          error_code: sendError.code || null,
          error_detail: sendError.rawSnippet || sendError.message || null,
        })
      } catch (logErr) {
        console.error('[marketingWhatsapp] Failed to write failure log:', logErr)
      }
      throw sendError
    }
  } catch (error) {
    console.error('[marketingWhatsapp] Dispatch failed:', error)
    // Best-effort outer failure log
    try {
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: customerUserId,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'customer',
        status: 'failed',
        content_preview: '[FAILED] ' + (dedupeTag ?? error.message).slice(0, 200),
        error_code: error.code || null,
        error_detail: error.rawSnippet || error.message || null,
      })
    } catch {
      // secondary DB failure — ignore to avoid masking original error
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notify a customer that their reward point balance has crossed a milestone.
 * Fired from notifyRewardEarned() in lib/rewardNotifications.js.
 * Milestones: 100, 500, 1000, 2500, 5000.
 *
 * Dedupe window: 24 hours (one notification per milestone crossing per day).
 *
 * @param {object} opts
 * @param {string} opts.userId        - auth user_id
 * @param {number} opts.pointsEarned  - points earned in this event
 * @param {number} opts.totalBalance  - new total balance after credit
 * @param {number} opts.milestone     - the milestone crossed (e.g. 500)
 */
export async function notifyCustomerRewardMilestone({ userId, pointsEarned, totalBalance, milestone }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerMarketingWhatsApp({
    adminClient,
    customerUserId: userId,
    template: REWARD_MILESTONE_TEMPLATE,
    templateArgs: [String(pointsEarned), String(totalBalance)],
    dedupeTag: `[template:intrust_reward_milestone_v1:${userId}:${milestone}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000,
  })
}

/**
 * Send a referral invite campaign message.
 * Referral code is fetched per-user from user_profiles.referral_code by the caller
 * (admin broadcast route) and passed in.
 *
 * Dedupe window: 7 days (one referral push per user per week).
 *
 * @param {object} opts
 * @param {string} opts.userId        - auth user_id
 * @param {string} opts.referralCode  - user's referral_code from user_profiles
 * @param {string} opts.bonusPoints   - bonus points text (e.g. "50")
 */
export async function notifyCustomerReferralInvite({ userId, referralCode, bonusPoints }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerMarketingWhatsApp({
    adminClient,
    customerUserId: userId,
    template: REFERRAL_INVITE_TEMPLATE,
    templateArgs: [String(referralCode), String(bonusPoints)],
    dedupeTag: `[template:intrust_referral_invite_v1:${userId}]`,
    dedupeWindowMs: 7 * 24 * 60 * 60 * 1000,
  })
}

/**
 * Send a gift card promotional campaign message.
 * Admin-triggered via the broadcast endpoint.
 *
 * Dedupe window: 24 hours.
 *
 * @param {object} opts
 * @param {string} opts.userId        - auth user_id
 * @param {string} opts.discountPct   - discount percentage string (e.g. "10")
 * @param {string} opts.promoDetails  - promo code / validity text
 */
export async function notifyCustomerGiftcardPromo({ userId, discountPct, promoDetails }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerMarketingWhatsApp({
    adminClient,
    customerUserId: userId,
    template: GIFTCARD_PROMO_TEMPLATE,
    templateArgs: [String(discountPct), String(promoDetails)],
    dedupeTag: `[template:intrust_giftcard_promo_v1:${userId}:${discountPct}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000,
  })
}

/**
 * Send a win-back message to an inactive customer.
 * Called by the weekly win-back cron (app/api/cron/winback/route.js).
 *
 * Dedupe window: 6 days (prevents duplicate sends if cron reruns in same week).
 *
 * @param {object} opts
 * @param {string} opts.userId         - auth user_id
 * @param {string} opts.firstName      - user's first name
 * @param {string} opts.rewardBalance  - current reward point balance
 */
export async function notifyCustomerWinback({ userId, firstName, rewardBalance }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerMarketingWhatsApp({
    adminClient,
    customerUserId: userId,
    template: WINBACK_TEMPLATE,
    templateArgs: [String(firstName), String(rewardBalance)],
    dedupeTag: `[template:intrust_winback_v1:${userId}]`,
    dedupeWindowMs: 6 * 24 * 60 * 60 * 1000,
  })
}

/**
 * Send a feature announcement campaign message.
 * Admin-triggered via the broadcast endpoint.
 *
 * Dedupe window: 24 hours.
 *
 * @param {object} opts
 * @param {string} opts.userId        - auth user_id
 * @param {string} opts.featureName   - name of the new feature
 * @param {string} opts.description   - short description of the feature
 */
export async function notifyCustomerFeatureAnnounce({ userId, featureName, description }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerMarketingWhatsApp({
    adminClient,
    customerUserId: userId,
    template: FEATURE_ANNOUNCE_TEMPLATE,
    templateArgs: [String(featureName), String(description)],
    dedupeTag: `[template:intrust_feature_announce_v1:${userId}:${featureName.slice(0, 30)}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000,
  })
}

/**
 * Send a festival / seasonal greeting campaign message.
 * Admin-triggered via the broadcast endpoint.
 *
 * Dedupe window: 24 hours.
 *
 * @param {object} opts
 * @param {string} opts.userId        - auth user_id
 * @param {string} opts.firstName     - user's first name
 * @param {string} opts.festivalName  - festival name (e.g. "Diwali", "Eid", "New Year")
 */
export async function notifyCustomerFestivalGreeting({ userId, firstName, festivalName }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerMarketingWhatsApp({
    adminClient,
    customerUserId: userId,
    template: FESTIVAL_GREETING_TEMPLATE,
    templateArgs: [String(firstName), String(festivalName)],
    dedupeTag: `[template:intrust_festival_greeting_v1:${userId}:${festivalName.slice(0, 20)}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000,
  })
}
