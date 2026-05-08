import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { generateOTP, hashOTP } from '@/lib/otpUtils';
import { sendTemplateMessage, normalisePhone, OTP_TEMPLATE } from '@/lib/omniflow';

/**
 * POST /api/whatsapp/link-phone
 * Sends a 6-digit OTP via WhatsApp to start the phone-linking flow.
 * The user replies to that WhatsApp message with the OTP.
 * The webhook (/api/webhooks/omniflow) then validates and creates the binding.
 */
export async function POST() {
  // Guard: fail fast if WhatsApp service is not configured
  if (!process.env.OMNIFLOW_API_TOKEN) {
    return NextResponse.json(
      { error: 'WhatsApp service is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    // 1. Get authenticated user from session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user's phone from user_profiles
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('phone, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.phone) {
      return NextResponse.json(
        { error: 'No phone number found on your account. Please update your profile first.' },
        { status: 400 }
      );
    }

    const normalised = normalisePhone(profile.phone);

    // 3. Check if already linked
    const { data: existingBinding } = await admin
      .from('user_channel_bindings')
      .select('id, phone')
      .eq('user_id', user.id)
      .eq('audience', 'customer')
      .maybeSingle();

    if (existingBinding) {
      return NextResponse.json(
        { error: 'Your WhatsApp is already linked. Visit your profile to manage it.' },
        { status: 409 }
      );
    }

    // 4. Delete any previous unexpired OTP for this user
    await admin
      .from('whatsapp_otp_codes')
      .delete()
      .eq('user_id', user.id);

    // 5. Generate OTP and store hashed version
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { error: otpInsertError } = await admin
      .from('whatsapp_otp_codes')
      .insert({
        user_id: user.id,
        phone: normalised,
        otp_hash: otpHash,
        expires_at: expiresAt,
        is_used: false,
      });

    if (otpInsertError) {
      console.error('[link-phone] OTP insert error:', otpInsertError);
      return NextResponse.json({ error: 'Failed to generate OTP. Please try again.' }, { status: 500 });
    }

    // 6. Send OTP via Omniflow WhatsApp template
    await sendTemplateMessage(
      normalised,
      OTP_TEMPLATE.name,
      OTP_TEMPLATE.language,
      OTP_TEMPLATE.buildComponents(otp)
    );

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your WhatsApp. Reply with the code to complete linking.',
    });
  } catch (err) {
    console.error('[link-phone] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
