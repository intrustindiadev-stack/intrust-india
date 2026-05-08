import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

/**
 * GET /api/whatsapp/status
 * Returns the WhatsApp linking status for the current authenticated user.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: binding, error } = await admin
      .from('user_channel_bindings')
      .select('phone, whatsapp_opt_in, linked_at')
      .eq('user_id', user.id)
      .eq('audience', 'customer')
      .maybeSingle();

    if (error) {
      console.error('[whatsapp/status] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch status.' }, { status: 500 });
    }

    if (!binding) {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: true,
      phone: binding.phone,
      whatsappOptIn: binding.whatsapp_opt_in,
      linkedAt: binding.linked_at,
    });
  } catch (err) {
    console.error('[whatsapp/status] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
