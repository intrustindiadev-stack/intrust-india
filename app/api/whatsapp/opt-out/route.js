import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { audience } = await ensureWhatsAppBinding({ userId: user.id });

    if (!audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 400 });
    }

    const { error } = await admin
      .from('user_channel_bindings')
      .update({ whatsapp_opt_in: false })
      .eq('user_id', user.id)
      .eq('audience', audience);

    if (error) {
      console.error('[whatsapp/opt-out] DB error:', error);
      return NextResponse.json({ error: 'Failed to opt out.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[whatsapp/opt-out] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
