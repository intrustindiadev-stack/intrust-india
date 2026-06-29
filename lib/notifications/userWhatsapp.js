'use server'

import { createAdminClient } from '@/lib/supabaseServer'
import {
  sendTemplateMessage,
  GM_GREET_TEMPLATE,
  GM_TIP_TEMPLATE,
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
async function _sendMorningGreeting({ adminClient, userId, phone, firstName, todayTag }) {
  // 1. Dedupe — skip if already sent today
  const { data: existing } = await adminClient
    .from('whatsapp_message_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('content_preview', todayTag)
    .eq('audience', 'customer')
    .maybeSingle();

  if (existing) return { skipped: true };

  // 2. Pick template (alternate daily)
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const useGreet = dayOfYear % 2 === 0;
  const template = useGreet ? GM_GREET_TEMPLATE : GM_TIP_TEMPLATE;
  const components = useGreet
    ? template.buildComponents(firstName)
    : template.buildComponents(getDailyTip());

  const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');

  // 3. Send
  try {
    const res = await sendTemplateMessage(phone, template.name, template.language, components);

    await adminClient.from('whatsapp_message_logs').insert({
      user_id: userId,
      phone_hash: phoneHash,
      direction: 'outbound',
      message_type: 'template',
      channel: 'whatsapp',
      audience: 'customer',
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
        audience: 'customer',
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
 * @returns {Promise<{ sent: number, skipped: number, failed: number, total: number }>}
 */
export async function broadcastMorningGreeting() {
  const adminClient = createAdminClient();

  // Today's date string (IST) used as the dedupe tag — ensures exactly one send per user per day
  const todayIST = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
  // e.g. "[gm-broadcast:25/06/2026]"
  const todayTag = `[gm-broadcast:${todayIST}]`;

  // 1. Fetch all opted-in customer bindings joined with their profile name
  const { data: bindings, error: bindError } = await adminClient
    .from('user_channel_bindings')
    .select(`
      user_id,
      phone,
      user_profiles!inner ( full_name )
    `)
    .eq('audience', 'customer')
    .eq('whatsapp_opt_in', true);

  if (bindError) throw new Error(`[gm-broadcast] Failed to fetch bindings: ${bindError.message}`);
  if (!bindings || bindings.length === 0) return { sent: 0, skipped: 0, failed: 0, total: 0 };

  let sent = 0, skipped = 0, failed = 0;

  for (const binding of bindings) {
    const rawName = binding.user_profiles?.full_name || '';
    // Use first word of full name, fallback to 'there'
    const firstName = rawName.split(' ')[0]?.trim() || 'there';

    const result = await _sendMorningGreeting({
      adminClient,
      userId: binding.user_id,
      phone: binding.phone,
      firstName,
      todayTag,
    });

    if (result.sent)    sent++;
    if (result.skipped) skipped++;
    if (result.failed)  failed++;

    // Small delay between sends to avoid rate-limit spikes on Omniflow
    await new Promise(r => setTimeout(r, 120));
  }

  return { sent, skipped, failed, total: bindings.length };
}
