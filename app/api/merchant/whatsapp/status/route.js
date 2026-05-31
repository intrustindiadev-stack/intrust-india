import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { ensureWhatsAppBinding } from '@/lib/whatsapp/ensureBinding';

/**
 * GET /api/merchant/whatsapp/status
 * Returns the WhatsApp linking status for the merchant audience.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['merchant', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure binding is up-to-date before reading the view
    await ensureWhatsAppBinding({ userId: user.id });

    const { data: viewData, error } = await admin
      .from('merchant_whatsapp_status')
      .select('linked_phone, whatsapp_opt_in, linked_at, business_phone')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[merchant/whatsapp/status] DB error:', error);
      return NextResponse.json({ error: 'Failed to fetch status.' }, { status: 500 });
    }

    if (!viewData) {
      // Missing merchant record
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: !!viewData.linked_phone,
      phone: viewData.linked_phone,
      linkedAt: viewData.linked_at,
      optIn: viewData.whatsapp_opt_in,
      businessPhone: viewData.business_phone
    });
  } catch (err) {
    console.error('[merchant/whatsapp/status] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

