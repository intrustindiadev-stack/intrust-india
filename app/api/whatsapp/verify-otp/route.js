import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { hashOTP } from '@/lib/otpUtils';
import { sendTemplateMessage, WELCOME_TEMPLATE } from '@/lib/omniflow';

/**
 * POST /api/whatsapp/verify-otp
 * Website-driven OTP verification flow — the user enters the 6-digit code
 * they received on WhatsApp directly on the profile page, instead of replying
 * to the WhatsApp message. Both paths (this route + the webhook) write to the
 * same user_channel_bindings table and are safe to coexist.
 */
export async function POST(req) {
  // Guard: fail fast if WhatsApp service is not configured
  if (!process.env.OMNIFLOW_API_TOKEN) {
    return NextResponse.json(
      { error: 'WhatsApp service is not configured. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    // 1. Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate OTP from request body
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
    const candidateHash = hashOTP(otp);

    // 3. Look up OTP record matching user_id + hash + not used
    const { data: otpRecord, error: otpLookupError } = await admin
      .from('whatsapp_otp_codes')
      .select('id, user_id, phone, expires_at, is_used')
      .eq('user_id', user.id)
      .eq('otp_hash', candidateHash)
      .eq('is_used', false)
      .maybeSingle();

    if (otpLookupError) {
      console.error('[whatsapp/verify-otp] OTP lookup error:', otpLookupError);
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

    // 4. Check expiry — clean up expired row so the table stays tidy
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

    // 5. The phone stored in the OTP row is already E.164-normalised
    const phone = otpRecord.phone;

    // 6. Defensive re-check: existing binding for this user_id
    const { data: existingBinding } = await admin
      .from('user_channel_bindings')
      .select('id')
      .eq('user_id', user.id)
      .eq('audience', 'customer')
      .maybeSingle();

    if (existingBinding) {
      // Mark OTP as used so it can't be replayed, then return 409
      await admin
        .from('whatsapp_otp_codes')
        .update({ is_used: true })
        .eq('id', otpRecord.id);

      return NextResponse.json(
        { error: 'WhatsApp is already linked.' },
        { status: 409 }
      );
    }

    // 7. Upsert the channel binding (mirrors webhook Flow A pattern)
    const linkedAt = new Date().toISOString();
    const { error: bindError } = await admin
      .from('user_channel_bindings')
      .upsert(
        {
          user_id: user.id,
          phone,
          audience: 'customer',
          whatsapp_opt_in: true,
          linked_at: linkedAt,
          updated_at: linkedAt,
        },
        { onConflict: 'user_id,audience' }
      );

    if (bindError) {
      console.error('[whatsapp/verify-otp] Binding upsert error:', bindError);
      return NextResponse.json(
        { error: 'Failed to link WhatsApp. Please try again.' },
        { status: 500 }
      );
    }

    // 8. Mark OTP as used
    await admin
      .from('whatsapp_otp_codes')
      .update({ is_used: true })
      .eq('id', otpRecord.id);

    // 9. Best-effort: insert in-app success notification (mirrors webhook Flow A)
    try {
      await admin.from('notifications').insert({
        user_id: user.id,
        title: 'WhatsApp Connected ✅',
        body: "Your WhatsApp number has been linked. You'll now receive order updates and alerts via WhatsApp.",
        type: 'success',
        reference_type: 'whatsapp_connected',
      });
    } catch (notifErr) {
      console.warn('[whatsapp/verify-otp] Notification insert failed (non-fatal):', notifErr);
    }

    // 10. Best-effort: send confirmation via approved template
    //     (plain sendWhatsAppMessage requires an active 24-hour window;
    //      a freshly-linked user has no prior conversation, so we must
    //      use sendTemplateMessage with the WELCOME_TEMPLATE instead.)
    try {
      await sendTemplateMessage(
        phone,
        WELCOME_TEMPLATE.name,
        WELCOME_TEMPLATE.language,
        WELCOME_TEMPLATE.buildComponents()
      );

      // Best-effort: log the outbound confirmation message
      try {
        const phoneHash = crypto.createHash('sha256').update(phone).digest('hex');
        await admin.from('whatsapp_message_logs').insert({
          user_id: user.id,
          phone_hash: phoneHash,
          direction: 'outbound',
          message_type: 'template',
          channel: 'web',
          status: 'delivered',
          content_preview: `[template:${WELCOME_TEMPLATE.name}]`,
        });
      } catch (logErr) {
        console.warn('[whatsapp/verify-otp] Message log insert failed (non-fatal):', logErr);
      }
    } catch (waErr) {
      console.warn('[whatsapp/verify-otp] Confirmation WA template send failed (non-fatal):', waErr);
    }

    // 11. Return success
    return NextResponse.json({
      success: true,
      linked: true,
      phone,
      linkedAt,
    });
  } catch (err) {
    console.error('[whatsapp/verify-otp] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}
