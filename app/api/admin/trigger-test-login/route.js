import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { createAdminClient } from '@/lib/supabaseServer';
import { sendTemplateMessage, LOGIN_ALERT_TEMPLATE } from '@/lib/omniflow';
import crypto from 'crypto';

/**
 * POST /api/admin/trigger-test-login
 * Diagnostic route to manually trigger the WhatsApp login alert template
 * to a specific user to verify failure/success logging and delivery.
 */
export async function POST(request) {
  // 1. Auth check
  const { user, profile } = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!['admin', 'super_admin'].includes(profile?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Parse and validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { targetUserId } = body;
  if (!targetUserId) {
    return NextResponse.json({ error: 'targetUserId is required.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. Lookup binding
  const { data: binding } = await admin
    .from('user_channel_bindings')
    .select('phone')
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (!binding?.phone) {
    return NextResponse.json({ error: 'User has no phone linked in user_channel_bindings' }, { status: 404 });
  }

  const phoneHash = crypto.createHash('sha256').update(binding.phone).digest('hex');
  const ua = request.headers.get('user-agent') || 'Unknown device';
  const deviceInfo = ua.length > 80 ? ua.slice(0, 77) + '...' : ua;
  const now = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }) + ' IST';

  try {
    const res = await sendTemplateMessage(
      binding.phone,
      LOGIN_ALERT_TEMPLATE.name,
      LOGIN_ALERT_TEMPLATE.language,
      LOGIN_ALERT_TEMPLATE.buildComponents(deviceInfo, now)
    );

    const { error } = await admin.from('whatsapp_message_logs').insert({
      user_id: targetUserId,
      phone_hash: phoneHash,
      direction: 'outbound',
      message_type: 'template',
      channel: 'whatsapp',
      status: 'sent',
      wamid: res?.messageId ?? null,
      content_preview: '[template:intrust_login_alert]',
    });

    if (error) {
      console.warn('[trigger-test-login] DB log error:', error.message);
    }

    return NextResponse.json({ success: true, status: 'sent', phone: binding.phone });
  } catch (sendError) {
    console.error('[trigger-test-login] WhatsApp login alert failed:', sendError.message);
    const { error } = await admin.from('whatsapp_message_logs').insert({
      user_id: targetUserId,
      phone_hash: phoneHash,
      direction: 'outbound',
      message_type: 'template',
      channel: 'whatsapp',
      status: 'failed',
      content_preview: '[FAILED] [template:intrust_login_alert] :: ' + sendError.message.slice(0, 150),
      error_code: sendError.code || null,
      error_detail: sendError.rawSnippet || sendError.message || null
    });

    if (error) {
      console.warn('[trigger-test-login] Failed to log failure:', error.message);
    }

    return NextResponse.json({ success: false, status: 'failed', error: sendError.message }, { status: 502 });
  }
}
