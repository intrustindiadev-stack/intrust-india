import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';

/**
 * POST /api/whatsapp/marketing-consent
 * Update the current user's marketing WhatsApp consent flag.
 *
 * Body: { optIn: boolean }
 *
 * - optIn: true  → user consents to receive promotional/marketing templates
 *                  (e.g. morning greetings, offers, rewards)
 * - optIn: false → user withdraws marketing consent; transactional alerts
 *                  (whatsapp_opt_in) are NOT affected.
 *
 * Returns: { success: true, whatsappMarketingOptIn: boolean }
 */
export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    let optIn = false;
    try {
      const body = await request.json();
      optIn = body?.optIn === true; // strict boolean — anything else is false
    } catch {
      return NextResponse.json({ error: 'Invalid request body. Expected { optIn: boolean }.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Resolve audience (customer / merchant) for this user
    const { audience } = await ensureWhatsAppBinding({ userId: user.id });

    if (!audience) {
      return NextResponse.json(
        { error: 'No WhatsApp binding found. Link a phone number first.' },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from('user_channel_bindings')
      .update({ whatsapp_marketing_opt_in: optIn })
      .eq('user_id', user.id)
      .eq('audience', audience);

    if (error) {
      console.error('[whatsapp/marketing-consent] DB error:', error);
      return NextResponse.json({ error: 'Failed to update marketing consent.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, whatsappMarketingOptIn: optIn });
  } catch (err) {
    console.error('[whatsapp/marketing-consent] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
