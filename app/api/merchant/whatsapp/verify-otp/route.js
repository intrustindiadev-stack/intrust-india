import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { hashOTP } from '@/lib/otpUtils';
import { sendTemplateMessage, MERCHANT_WELCOME_LINKED_TEMPLATE } from '@/lib/omniflow';

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

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { otp } = body;

    if (!otp || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit OTP code.' },
        { status: 400 }
      );
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

    const candidateHash = hashOTP(otp);

    const { data: otpRecord, error: otpLookupError } = await admin
      .from('whatsapp_otp_codes')
      .select('id, user_id, phone, expires_at, is_used')
      .eq('user_id', user.id)
      .eq('otp_hash', candidateHash)
      .eq('is_used', false)
      .maybeSingle();

    if (otpLookupError) {
      console.error('[merchant/whatsapp/verify-otp] OTP lookup error:', otpLookupError);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 }
      );
    }

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid OTP code. Please check and try again.' },
        { status: 400 }
      );
    }

    if (new Date(otpRecord.expires_at) <= new Date()) {
      await admin
        .from('whatsapp_otp_codes')
        .delete()
        .eq('id', otpRecord.id);

      return NextResponse.json(
        { error: 'This OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    const phone = otpRecord.phone;

    const { data: existingBinding } = await admin
      .from('user_channel_bindings')
      .select('id')
      .eq('user_id', user.id)
      .eq('audience', 'merchant')
      .maybeSingle();

    if (existingBinding) {
      await admin
        .from('whatsapp_otp_codes')
        .update({ is_used: true })
        .eq('id', otpRecord.id);

      return NextResponse.json(
        { error: 'WhatsApp is already linked.' },
        { status: 409 }
      );
    }

    const linkedAt = new Date().toISOString();
    const { error: bindError } = await admin
      .from('user_channel_bindings')
      .upsert(
        {
          user_id: user.id,
          phone,
          audience: 'merchant',
          whatsapp_opt_in: true,
          linked_at: linkedAt,
          updated_at: linkedAt,
        },
        { onConflict: 'user_id,audience' }
      );

    if (bindError) {
      console.error('[merchant/whatsapp/verify-otp] Binding upsert error:', bindError);
      return NextResponse.json(
        { error: 'Failed to link WhatsApp. Please try again.' },
        { status: 500 }
      );
    }

    // Step 2: Eager row creation for notification settings
    try {
      const { data: merchantData } = await admin
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (merchantData?.id) {
        await admin
          .from('merchant_notification_settings')
          .upsert({
            merchant_id: merchantData.id,
            whatsapp_order_alerts: true,
            whatsapp_payout_alerts: true,
            whatsapp_store_credit_alerts: true,
            whatsapp_kyc_alerts: true,
            whatsapp_subscription_alerts: true,
            whatsapp_product_alerts: true,
            whatsapp_marketing: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'merchant_id' });
      }
    } catch (settingsErr) {
      console.warn('[merchant/whatsapp/verify-otp] Settings eager creation failed (non-fatal):', settingsErr);
    }

    await admin
      .from('whatsapp_otp_codes')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    try {
      await admin.from('notifications').insert({
        user_id: user.id,
        title: 'WhatsApp Connected ✅',
        body: "Your business WhatsApp is now linked. You'll receive order, payout and store-credit alerts here.",
        type: 'success',
        reference_type: 'whatsapp_connected',
      });
    } catch (notifErr) {
      console.warn('[merchant/whatsapp/verify-otp] Notification insert failed (non-fatal):', notifErr);
    }

    try {
      await sendTemplateMessage(
        phone,
        MERCHANT_WELCOME_LINKED_TEMPLATE.name,
        MERCHANT_WELCOME_LINKED_TEMPLATE.language,
        MERCHANT_WELCOME_LINKED_TEMPLATE.buildComponents()
      );

      try {
        const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');
        await admin.from('whatsapp_message_logs').insert({
          user_id: user.id,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          status: 'delivered',
          content_preview: `[template:${MERCHANT_WELCOME_LINKED_TEMPLATE.name}]`,
          audience: 'merchant'
        });
      } catch (logErr) {
        console.warn('[merchant/whatsapp/verify-otp] Message log insert failed (non-fatal):', logErr);
      }
    } catch (waErr) {
      console.warn('[merchant/whatsapp/verify-otp] Confirmation WA template send failed (non-fatal):', waErr);
      // 3b. Best-effort failed log for observability
      try {
        const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');
        await admin.from('whatsapp_message_logs').insert({
          user_id: user.id,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'whatsapp',
          audience: 'merchant',
          status: 'failed',
          content_preview: '[FAILED] ' + MERCHANT_WELCOME_LINKED_TEMPLATE.name + ' :: ' + waErr.message.slice(0, 150)
        });
      } catch {
        // non-fatal — swallow
      }
    }

    return NextResponse.json({
      success: true,
      linked: true,
      phone,
      linkedAt,
    });
  } catch (err) {
    console.error('[merchant/whatsapp/verify-otp] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
