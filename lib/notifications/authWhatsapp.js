'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import { 
  sendTemplateMessage,
  normalisePhone,
  WELCOME_TEMPLATE,
  MERCHANT_WELCOME_LINKED_TEMPLATE,
  LOGIN_ALERT_TEMPLATE
} from '@/lib/omniflow'
import crypto from 'crypto'

/**
 * Send a WhatsApp welcome message when a user links their WhatsApp account.
 * Deduplicates to prevent sending multiple welcomes to the same user per audience.
 * Non-throwing: logs errors and swallows them.
 */
export async function sendWhatsAppWelcomeOnLink({ userId, audience, phone }) {
  try {
    const adminClient = createAdminClient()
    const welcomeTag = audience === 'merchant'
      ? '[template:intrust_merchant_welcome_linked]'
      : '[template:intrust_welcome_linked]'

    // 1. Dedup check: query whatsapp_message_logs for an existing welcome row
    const { data: existingLog, error: fetchError } = await adminClient
      .from('whatsapp_message_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('audience', audience)
      .eq('content_preview', welcomeTag)
      .maybeSingle()

    if (fetchError) {
      console.error('[authWhatsapp] Failed to check for existing welcome log:', fetchError)
    }

    if (existingLog) {
      console.log(`[authWhatsapp] Welcome message already sent for user ${userId} (${audience}). Skipping.`)
      return
    }

    // 2. Select template
    const template = audience === 'merchant'
      ? MERCHANT_WELCOME_LINKED_TEMPLATE
      : WELCOME_TEMPLATE

    // 3. Normalise phone and hash it
    const normalised = normalisePhone(phone)
    const phoneHash = crypto.createHash('sha256').update(normalised).digest('hex')

    // 4. Send and log
    try {
      const res = await sendTemplateMessage(phone, template.name, template.language, [])

      await adminClient.from('whatsapp_message_logs').insert({
        user_id: userId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience,
        status: 'sent',
        wamid: res?.messageId ?? null,
        content_preview: welcomeTag
      })
    } catch (sendError) {
      console.error('[authWhatsapp] Welcome send failed, logging failure:', sendError)
      try {
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: userId,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          audience,
          status: 'failed',
          content_preview: '[FAILED] ' + welcomeTag + ' :: ' + sendError.message.slice(0, 150),
          error_code: sendError.code || null,
          error_detail: sendError.rawSnippet || sendError.message || null
        })
      } catch (logError) {
        console.error('[authWhatsapp] Failed to write failure log for welcome:', logError)
      }
    }
  } catch (error) {
    console.error('[authWhatsapp] Unexpected welcome flow failure:', error)
  }
}

/**
 * Send a WhatsApp login alert message when a new login is detected.
 * Deduplicates to skip sending if a login alert was sent within the last 5 minutes.
 * Non-throwing: logs errors and swallows them.
 */
export async function sendWhatsAppLoginAlert({ userId, audience, phone, deviceInfo }) {
  try {
    const adminClient = createAdminClient()
    const dedupeWindow = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // 1. Dedup check: check if login alert sent within last 5 minutes
    const { data: recentAlert, error: fetchError } = await adminClient
      .from('whatsapp_message_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('content_preview', '[template:intrust_login_alert]')
      .gte('created_at', dedupeWindow)
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error('[authWhatsapp] Failed to check recent login alerts:', fetchError)
    }

    if (recentAlert) {
      console.log(`[authWhatsapp] Skipping duplicate login alert for user ${userId} (sent within 5 min)`)
      return
    }

    // 2. Normalise phone and hash it
    const normalised = normalisePhone(phone)
    const phoneHash = crypto.createHash('sha256').update(normalised).digest('hex')

    // 3. Build IST timestamp + device info
    const ua = deviceInfo || 'Unknown device'
    const parsedDeviceInfo = ua.length > 80 ? ua.slice(0, 77) + '...' : ua
    const now = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }) + ' IST'
    const audienceLabel = audience === 'merchant' ? '[Merchant]' : '[Customer]'
    const displayDeviceInfo = `${audienceLabel} ${parsedDeviceInfo}`

    // 4. Send and log
    try {
      const res = await sendTemplateMessage(
        phone,
        LOGIN_ALERT_TEMPLATE.name,
        LOGIN_ALERT_TEMPLATE.language,
        LOGIN_ALERT_TEMPLATE.buildComponents(displayDeviceInfo, now)
      )

      await adminClient.from('whatsapp_message_logs').insert({
        user_id: userId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        status: 'sent',
        wamid: res?.messageId ?? null,
        content_preview: '[template:intrust_login_alert]',
        audience,
      })
    } catch (sendError) {
      console.error('[authWhatsapp] Login alert send failed, logging failure:', sendError)
      try {
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: userId,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          status: 'failed',
          content_preview: '[FAILED] [template:intrust_login_alert] :: ' + sendError.message.slice(0, 150),
          error_code: sendError.code || null,
          error_detail: sendError.rawSnippet || sendError.message || null,
          audience,
        })
      } catch (logError) {
        console.error('[authWhatsapp] Failed to write failure log for login alert:', logError)
      }
    }
  } catch (error) {
    console.error('[authWhatsapp] Unexpected login alert flow failure:', error)
  }
}
