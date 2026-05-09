import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { generateOTP, hashOTP, validatePhoneNumber } from '@/lib/otpUtils';
import { sendTemplateMessage, normalisePhone, MERCHANT_OTP_TEMPLATE } from '@/lib/omniflow';

export async function POST(req) {
  if (!process.env.OMNIFLOW_API_TOKEN) {
    return NextResponse.json(
      { error: 'WhatsApp service is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('role, phone')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    if (!['merchant', 'admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body = {};
    try {
      body = await req.json();
    } catch {}

    let phoneToUse = body.phone && validatePhoneNumber(body.phone) ? body.phone : null;

    if (!phoneToUse) {
      const { data: merchantData, error: merchantError } = await admin
        .from('merchants')
        .select('id, business_phone')
        .eq('user_id', user.id)
        .single();
        
      if (merchantError || !merchantData) {
         return NextResponse.json({ error: 'Merchant record not found' }, { status: 404 });
      }
      phoneToUse = merchantData.business_phone || profile.phone;
    }

    if (!phoneToUse) {
      return NextResponse.json(
        { error: 'No phone number found. Please add a business phone in your profile first.' },
        { status: 400 }
      );
    }

    const normalised = normalisePhone(phoneToUse);

    const { data: existingBinding } = await admin
      .from('user_channel_bindings')
      .select('id')
      .eq('user_id', user.id)
      .eq('audience', 'merchant')
      .maybeSingle();

    if (existingBinding) {
      return NextResponse.json(
        { error: 'Your merchant WhatsApp is already linked. Disconnect from Settings to re-link.' },
        { status: 409 }
      );
    }

    await admin
      .from('whatsapp_otp_codes')
      .delete()
      .eq('user_id', user.id);

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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
      console.error('[merchant/whatsapp/link-phone] OTP insert error:', otpInsertError);
      return NextResponse.json({ error: 'Failed to generate OTP. Please try again.' }, { status: 500 });
    }

    await sendTemplateMessage(
      normalised,
      MERCHANT_OTP_TEMPLATE.name,
      MERCHANT_OTP_TEMPLATE.language,
      MERCHANT_OTP_TEMPLATE.buildComponents(otp)
    );

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your business WhatsApp number.',
    });
  } catch (err) {
    console.error('[merchant/whatsapp/link-phone] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
