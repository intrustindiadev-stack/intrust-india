'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import {
  LOGIN_ALERT_TEMPLATE,
  GM_GREET_TEMPLATE,
  GM_TIP_TEMPLATE,
  GM_QUOTE_TEMPLATE,
  GE_GREET_TEMPLATE,
  ORDER_STATUS_TEMPLATE,
  WALLET_LOW_BALANCE_TEMPLATE,
  KYC_REMINDER_TEMPLATE,
  UDHARI_DUE_REMINDER_TEMPLATE,
  sendTemplateMessage,
} from '@/lib/omniflow'
import crypto from 'crypto'

// ─── Rotating daily tips ─────────────────────────────────────────────────────
// The tip is picked by day-of-year so every user gets the same tip on the same
// day, but it rotates automatically without any DB state.
const DAILY_TIPS = [
  'Set aside 20% of every income before spending. Automate it so you never forget.',
  'Track every rupee you spend this week. Awareness is the first step to wealth.',
  'Avoid impulse purchases — wait 24 hours before buying anything unplanned.',
  'An emergency fund of 3–6 months of expenses is your best financial safety net.',
  'Pay off high-interest debt first. Interest you save is money you earn.',
  'Small daily savings compound into life-changing wealth over 10 years.',
  'Review your subscriptions today — cancel the ones you no longer use.',
];

function getDailyTip() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}

/**
 * Broadcast the daily good morning WhatsApp message to a single opted-in user.
 * Uses GM_GREET_TEMPLATE (personalised) on even days and GM_TIP_TEMPLATE on odd
 * days so users see variety.
 *
 * @param {object} opts
 * @param {*}      opts.adminClient  - Supabase admin client
 * @param {string} opts.userId       - auth user_id
 * @param {string} opts.phone        - raw phone from user_channel_bindings
 * @param {string} opts.firstName    - user's first name
 * @param {string} opts.todayTag     - dedupe tag scoped to today's date
 */
async function _sendMorningGreeting({ adminClient, userId, phone, firstName, quoteText, todayTag, audience = 'customer' }) {
  const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');

  // 1. Dedupe — skip if already sent today
  const { data: existing } = await adminClient
    .from('whatsapp_message_logs')
    .select('id')
    .eq('phone_hash', phoneHash)
    .eq('content_preview', todayTag)
    .maybeSingle();

  if (existing) return { skipped: true };

  // 2. Build components — GM_QUOTE_TEMPLATE: {{1}} = firstName, {{2}} = quoteText
  const components = GM_QUOTE_TEMPLATE.buildComponents(firstName, quoteText);

  // 3. Send
  try {
    const res = await sendTemplateMessage(
      phone,
      GM_QUOTE_TEMPLATE.name,
      GM_QUOTE_TEMPLATE.language,
      components
    );

    await adminClient.from('whatsapp_message_logs').insert({
      user_id: userId,
      phone_hash: phoneHash,
      direction: 'outbound',
      message_type: 'template',
      channel: 'whatsapp',
      audience,
      status: 'sent',
      wamid: res?.messageId ?? null,
      content_preview: todayTag,
    });

    return { sent: true };
  } catch (sendError) {
    try {
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: userId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience,
        status: 'failed',
        content_preview: '[FAILED] ' + todayTag + ' :: ' + sendError.message.slice(0, 150),
        error_code: sendError.code || null,
        error_detail: sendError.rawSnippet || sendError.message || null,
      });
    } catch {
      // secondary log failure — ignore
    }
    return { failed: true, error: sendError.message };
  }
}

/**
 * Broadcast morning WhatsApp greetings to all opted-in customer users.
 * Exported so it can be called from the cron route.
 *
 * Implementation notes:
 *  - Step 0 (new): Fetches today's scheduled quote from the daily_quotes table.
 *    If none is found the broadcast is skipped entirely — no message is sent and
 *    no finance-language fallback fires. An audit row is written so the skip is
 *    always visible in whatsapp_message_logs.
 *  - user_channel_bindings has a FK to auth.users only, NOT to user_profiles.
 *    The PostgREST embed `user_profiles!inner(full_name)` therefore fails with a
 *    relationship error. We fetch bindings and profiles in two separate queries
 *    and join them in-memory.
 *  - A broadcast-run audit row is written to whatsapp_message_logs on every
 *    invocation (even zero recipients / query errors) so failures are never silent.
 *  - Template used: GM_QUOTE_TEMPLATE (intrust_gm_quote_v1) — neutral, no finance
 *    language. Parameters: {{1}} = firstName, {{2}} = quoteText.
 *
 * @returns {Promise<{ sent: number, skipped: number, failed: number, total: number, quote_id?: string }>}
 */
export async function broadcastMorningGreeting() {
  const adminClient = createAdminClient();

  // Today's date string (IST) used as the dedupe tag — ensures exactly one send per user per day
  const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  // ISO date string for the daily_quotes lookup (YYYY-MM-DD)
  const todayDateISO = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA → YYYY-MM-DD
  // e.g. "[gm-broadcast:25/06/2026]"
  const todayTag = `[gm-broadcast:${todayIST}]`;

  // ── Helper: write a broadcast-run audit row so every invocation is visible ──
  const writeBroadcastAudit = async (status, summary) => {
    try {
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: null,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'customer',
        status,
        content_preview: `[gm-broadcast-run:${todayIST}] ${summary}`.slice(0, 250),
      });
    } catch {
      // audit write failure — swallow so it never blocks the caller
    }
  };

  // ── 0. Fetch today's scheduled quote ─────────────────────────────────────
  // If no quote is scheduled for today, skip the broadcast entirely.
  // This prevents the old finance-language templates from firing as a fallback.
  const { data: todayQuote, error: quoteError } = await adminClient
    .from('daily_quotes')
    .select('id, quote_text')
    .eq('scheduled_date', todayDateISO)
    .eq('status', 'scheduled')
    .maybeSingle();

  if (quoteError) {
    await writeBroadcastAudit('failed', `quote_fetch_error: ${quoteError.message}`);
    throw new Error(`[gm-broadcast] Failed to fetch daily quote: ${quoteError.message}`);
  }

  if (!todayQuote) {
    console.log(`[gm-broadcast] No quote scheduled for ${todayDateISO}. Broadcast skipped.`);
    await writeBroadcastAudit('skipped', `no_quote_scheduled for ${todayDateISO}`);
    return { sent: 0, skipped: 0, failed: 0, total: 0 };
  }

  const quoteText = todayQuote.quote_text;
  console.log(`[gm-broadcast] Quote found (id=${todayQuote.id}): "${quoteText.slice(0, 60)}…"`);

  // ── 1. Fetch opted-in customer bindings (no embed — user_channel_bindings has
  //       no FK to user_profiles, only to auth.users) ─────────────────────────
  // Both flags required:
  //   whatsapp_opt_in           = master transactional opt-in (account alerts etc.)
  //   whatsapp_marketing_opt_in = explicit marketing consent (Meta marketing category)
  const { data: bindings, error: bindError } = await adminClient
    .from('user_channel_bindings')
    .select('user_id, phone, audience')
    .in('audience', ['customer', 'merchant'])
    .eq('whatsapp_opt_in', true)
    .eq('whatsapp_marketing_opt_in', true);

  if (bindError) {
    await writeBroadcastAudit('failed', `binding_fetch_error: ${bindError.message}`);
    throw new Error(`[gm-broadcast] Failed to fetch bindings: ${bindError.message}`);
  }

  if (!bindings || bindings.length === 0) {
    await writeBroadcastAudit('skipped', 'no_opted_in_recipients');
    return { sent: 0, skipped: 0, failed: 0, total: 0 };
  }

  // Deduplicate by phone
  const uniqueBindings = [];
  const seenPhones = new Set();
  for (const b of bindings) {
    if (!seenPhones.has(b.phone)) {
      seenPhones.add(b.phone);
      uniqueBindings.push(b);
    }
  }

  // ── 2. Batch-fetch first names from profiles ────────
  const customerIds = uniqueBindings.filter(b => b.audience === 'customer').map(b => b.user_id).filter(Boolean);
  const merchantIds = uniqueBindings.filter(b => b.audience === 'merchant').map(b => b.user_id).filter(Boolean);
  let nameMap = {}; // user_id → firstName

  if (customerIds.length > 0) {
    const { data: profiles, error: profileError } = await adminClient
      .from('user_profiles')
      .select('id, full_name')
      .in('id', customerIds);

    if (profileError) {
      console.warn('[gm-broadcast] user_profiles fetch error:', profileError.message);
    } else if (profiles) {
      for (const p of profiles) {
        nameMap[p.id] = (p.full_name || '').split(' ')[0]?.trim() || 'there';
      }
    }
  }

  if (merchantIds.length > 0) {
    const { data: merchants, error: merchantError } = await adminClient
      .from('merchants')
      .select('id, business_name')
      .in('id', merchantIds);

    if (merchantError) {
      console.warn('[gm-broadcast] merchants fetch error:', merchantError.message);
    } else if (merchants) {
      for (const m of merchants) {
        nameMap[m.id] = nameMap[m.id] || (m.business_name || '').split(' ')[0]?.trim() || 'there';
      }
    }
  }

  // ── 3. Send to each recipient using GM_QUOTE_TEMPLATE ────────────────────
  // Template: intrust_gm_quote_v1  |  {{1}} = firstName, {{2}} = quoteText
  let sent = 0, skipped = 0, failed = 0;

  for (const binding of uniqueBindings) {
    const firstName = nameMap[binding.user_id] || 'there';

    const result = await _sendMorningGreeting({
      adminClient,
      userId: binding.user_id,
      phone: binding.phone,
      audience: binding.audience,
      firstName,
      quoteText,
      todayTag,
    });

    if (result.sent)    sent++;
    if (result.skipped) skipped++;
    if (result.failed)  failed++;

    // Small delay between sends to avoid rate-limit spikes on Omniflow
    await new Promise(r => setTimeout(r, 120));
  }

  // ── 4. Mark the quote as sent ─────────────────────────────────────────────
  const { error: updateError } = await adminClient
    .from('daily_quotes')
    .update({ status: 'sent' })
    .eq('id', todayQuote.id);

  if (updateError) {
    // Non-fatal — log but don't throw. Delivery already complete.
    console.error('[gm-broadcast] Failed to mark quote as sent:', updateError.message);
  }

  await writeBroadcastAudit(
    'sent',
    `done — sent:${sent} skipped:${skipped} failed:${failed} total:${bindings.length} quote_id:${todayQuote.id}`
  );

  return { sent, skipped, failed, total: bindings.length, quote_id: todayQuote.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENING GREETING BROADCAST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send the daily good evening WhatsApp message to a single opted-in user.
 *
 * @param {object} opts
 * @param {*}      opts.adminClient  - Supabase admin client
 * @param {string} opts.userId       - auth user_id
 * @param {string} opts.phone        - raw phone from user_channel_bindings
 * @param {string} opts.firstName    - user's first name
 * @param {string} opts.todayTag     - dedupe tag scoped to today's date
 */
async function _sendEveningGreeting({ adminClient, userId, phone, firstName, todayTag, audience = 'customer' }) {
  const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');

  // 1. Dedupe — skip if already sent today
  const { data: existing } = await adminClient
    .from('whatsapp_message_logs')
    .select('id')
    .eq('phone_hash', phoneHash)
    .eq('content_preview', todayTag)
    .maybeSingle();

  if (existing) return { skipped: true };

  const components = GE_GREET_TEMPLATE.buildComponents(firstName);

  // 2. Send
  try {
    const res = await sendTemplateMessage(
      phone,
      GE_GREET_TEMPLATE.name,
      GE_GREET_TEMPLATE.language,
      components
    );

    await adminClient.from('whatsapp_message_logs').insert({
      user_id: userId,
      phone_hash: phoneHash,
      direction: 'outbound',
      message_type: 'template',
      channel: 'whatsapp',
      audience,
      status: 'sent',
      wamid: res?.messageId ?? null,
      content_preview: todayTag,
    });

    return { sent: true };
  } catch (sendError) {
    try {
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: userId,
        phone_hash: phoneHash,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience,
        status: 'failed',
        content_preview: '[FAILED] ' + todayTag + ' :: ' + sendError.message.slice(0, 150),
        error_code: sendError.code || null,
        error_detail: sendError.rawSnippet || sendError.message || null,
      });
    } catch {
      // secondary log failure — ignore
    }
    return { failed: true, error: sendError.message };
  }
}

/**
 * Broadcast evening WhatsApp greetings to all opted-in customer users.
 * Exported so it can be called from the cron route.
 *
 * Implementation notes:
 *  - Same two-query pattern as broadcastMorningGreeting — bindings fetched
 *    without the broken PostgREST embed; names batch-fetched from user_profiles.
 *  - Both consent flags required: whatsapp_opt_in AND whatsapp_marketing_opt_in.
 *  - Dedupe tag `[ge-broadcast:<date>]` ensures exactly one send per user per evening.
 *  - Audit row written on every invocation so failures are never silent.
 *
 * @returns {Promise<{ sent: number, skipped: number, failed: number, total: number }>}
 */
export async function broadcastEveningGreeting() {
  const adminClient = createAdminClient();

  // Today's date string (IST) — same date scope as morning broadcast
  const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  // e.g. "[ge-broadcast:25/06/2026]"
  const todayTag = `[ge-broadcast:${todayIST}]`;

  // ── Helper: write a broadcast-run audit row so every invocation is visible ──
  const writeBroadcastAudit = async (status, summary) => {
    try {
      await adminClient.from('whatsapp_message_logs').insert({
        user_id: null,
        direction: 'outbound',
        message_type: 'template',
        channel: 'whatsapp',
        audience: 'customer',
        status,
        content_preview: `[ge-broadcast-run:${todayIST}] ${summary}`.slice(0, 250),
      });
    } catch {
      // audit write failure — swallow so it never blocks the caller
    }
  };

  // ── 1. Fetch opted-in customer bindings ───────────────────────────────────────
  // Both flags required (Meta marketing category compliance).
  const { data: bindings, error: bindError } = await adminClient
    .from('user_channel_bindings')
    .select('user_id, phone, audience')
    .in('audience', ['customer', 'merchant'])
    .eq('whatsapp_opt_in', true)
    .eq('whatsapp_marketing_opt_in', true);

  if (bindError) {
    await writeBroadcastAudit('failed', `binding_fetch_error: ${bindError.message}`);
    throw new Error(`[ge-broadcast] Failed to fetch bindings: ${bindError.message}`);
  }

  if (!bindings || bindings.length === 0) {
    await writeBroadcastAudit('skipped', 'no_opted_in_recipients');
    return { sent: 0, skipped: 0, failed: 0, total: 0 };
  }

  // Deduplicate by phone
  const uniqueBindings = [];
  const seenPhones = new Set();
  for (const b of bindings) {
    if (!seenPhones.has(b.phone)) {
      seenPhones.add(b.phone);
      uniqueBindings.push(b);
    }
  }

  // ── 2. Batch-fetch first names from profiles ───────────────────────────
  const customerIds = uniqueBindings.filter(b => b.audience === 'customer').map(b => b.user_id).filter(Boolean);
  const merchantIds = uniqueBindings.filter(b => b.audience === 'merchant').map(b => b.user_id).filter(Boolean);
  let nameMap = {}; // user_id → firstName

  if (customerIds.length > 0) {
    const { data: profiles, error: profileError } = await adminClient
      .from('user_profiles')
      .select('id, full_name')
      .in('id', customerIds);

    if (profileError) {
      console.warn('[ge-broadcast] user_profiles fetch error:', profileError.message);
    } else if (profiles) {
      for (const p of profiles) {
        nameMap[p.id] = (p.full_name || '').split(' ')[0]?.trim() || 'there';
      }
    }
  }

  if (merchantIds.length > 0) {
    const { data: merchants, error: merchantError } = await adminClient
      .from('merchants')
      .select('id, business_name')
      .in('id', merchantIds);

    if (merchantError) {
      console.warn('[ge-broadcast] merchants fetch error:', merchantError.message);
    } else if (merchants) {
      for (const m of merchants) {
        nameMap[m.id] = nameMap[m.id] || (m.business_name || '').split(' ')[0]?.trim() || 'there';
      }
    }
  }

  // ── 3. Send to each recipient ─────────────────────────────────────────────
  let sent = 0, skipped = 0, failed = 0;

  for (const binding of uniqueBindings) {
    const firstName = nameMap[binding.user_id] || 'there';

    const result = await _sendEveningGreeting({
      adminClient,
      userId: binding.user_id,
      phone: binding.phone,
      audience: binding.audience,
      firstName,
      todayTag,
    });

    if (result.sent)    sent++;
    if (result.skipped) skipped++;
    if (result.failed)  failed++;

    // Small delay between sends to avoid rate-limit spikes on Omniflow
    await new Promise(r => setTimeout(r, 120));
  }

  await writeBroadcastAudit('sent', `done — sent:${sent} skipped:${skipped} failed:${failed} total:${bindings.length}`);

  return { sent, skipped, failed, total: bindings.length };
}

// ── UTILITY DISPATCHER ──────────────────────────────────────────────────────────

/**
 * Dispatches a utility WhatsApp message to a customer.
 * Only requires `whatsapp_opt_in = true` (bypasses marketing consent).
 */
async function _dispatchCustomerUtilityWhatsApp({
  adminClient,
  customerUserId,
  template,
  templateArgs,
  dedupeTag,
  dedupeWindowMs = 24 * 60 * 60 * 1000 // default 24h
}) {
  try {
    const { data: binding } = await adminClient
      .from('user_channel_bindings')
      .select('phone')
      .eq('user_id', customerUserId)
      .eq('audience', 'customer')
      .eq('whatsapp_opt_in', true)
      .maybeSingle()

    if (!binding?.phone) return { skipped: true, reason: 'no_opt_in' }

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

      if (existingLog) return { skipped: true, reason: 'deduped' }
    }

    const components = template.buildComponents(...templateArgs)
    const phoneHash = crypto.createHash('sha256').update(binding.phone).digest('hex')

    try {
      const res = await sendTemplateMessage(
        binding.phone,
        template.name,
        template.language,
        components,
      )

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
      try {
        await adminClient.from('whatsapp_message_logs').insert({
          user_id: customerUserId,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          audience: 'customer',
          status: 'failed',
          error_details: sendError.message,
          content_preview: dedupeTag,
        })
      } catch (logErr) {}
      throw sendError
    }
  } catch (err) {
    console.error(`[_dispatchCustomerUtilityWhatsApp] Failed to send ${template.name}:`, err)
    throw err
  }
}

// ── UTILITY PUBLIC API ────────────────────────────────────────────────────────

export async function notifyCustomerOrderStatus({ userId, orderId, newStatus }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerUtilityWhatsApp({
    adminClient,
    customerUserId: userId,
    template: ORDER_STATUS_TEMPLATE,
    templateArgs: [String(orderId), String(newStatus)],
    // No dedupe tag needed for order status transition, it's transactional
  })
}

export async function notifyCustomerWalletLowBalance({ userId, balance }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerUtilityWhatsApp({
    adminClient,
    customerUserId: userId,
    template: WALLET_LOW_BALANCE_TEMPLATE,
    templateArgs: [String(balance)],
    dedupeTag: `[low-balance-alert:${new Date().toISOString().split('T')[0]}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000 // 1 per day
  })
}

export async function notifyCustomerKycReminder({ userId, firstName, daysPending }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerUtilityWhatsApp({
    adminClient,
    customerUserId: userId,
    template: KYC_REMINDER_TEMPLATE,
    templateArgs: [String(firstName), String(daysPending)],
    dedupeTag: `[kyc-reminder:${new Date().toISOString().split('T')[0]}]`,
    dedupeWindowMs: 7 * 24 * 60 * 60 * 1000 // 1 per week
  })
}

export async function notifyCustomerUdhariDue({ userId, merchantName, amount, dueDate, status }) {
  const adminClient = createAdminClient()
  return _dispatchCustomerUtilityWhatsApp({
    adminClient,
    customerUserId: userId,
    template: UDHARI_DUE_REMINDER_TEMPLATE,
    templateArgs: [String(merchantName), String(amount), String(dueDate), String(status)],
    dedupeTag: `[udhari-due:${merchantName}-${dueDate}-${status}]`,
    dedupeWindowMs: 24 * 60 * 60 * 1000
  })
}

