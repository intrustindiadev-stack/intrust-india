import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { createAdminClient } from '@/lib/supabaseServer';
import { sendWhatsAppLoginAlert } from '@/lib/notifications/authWhatsapp';

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
    .select('phone, audience')
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (!binding?.phone) {
    return NextResponse.json({ error: 'User has no phone linked in user_channel_bindings' }, { status: 404 });
  }

  const ua = request.headers.get('user-agent') || 'Unknown device';

  try {
    await sendWhatsAppLoginAlert({
      userId: targetUserId,
      audience: binding.audience,
      phone: binding.phone,
      deviceInfo: ua
    });

    return NextResponse.json({ success: true, status: 'sent', phone: binding.phone });
  } catch (sendError) {
    console.error('[trigger-test-login] WhatsApp login alert failed:', sendError.message);
    return NextResponse.json({ success: false, status: 'failed', error: sendError.message }, { status: 502 });
  }
}
