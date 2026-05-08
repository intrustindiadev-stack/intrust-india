import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabaseServer';
import { hashOTP } from '@/lib/otpUtils';
import { sendWhatsAppMessage, sendMessageToAgent, normalisePhone, sendTemplateMessage, WELCOME_TEMPLATE } from '@/lib/omniflow';
import { sanitizeMessage } from '@/lib/piiFilter';
import { enforceIntent } from '@/lib/intentEnforcer';

/**
 * OMNIFLOW / META WEBHOOK REGISTRATION SETUP
 * 
 * To receive WhatsApp events, configure the following in external dashboards:
 * 
 * 1. Omniflow Dashboard:
 *    - Webhook URL: https://intrustindia.com/api/webhooks/omniflow
 *    - Events: message_received, message_status
 *    - Signature Header: X-Omniflow-Signature
 * 
 * 2. Meta Business Manager:
 *    - Verify Token: Must match the META_WEBHOOK_VERIFY_TOKEN env var.
 *    - Required Template: Create 'intrust_otp_verification' (Language: en) 
 *      with one body variable {{1}} for the OTP code. Submit for approval.
 */

/**
 * POST /api/webhooks/omniflow
 *
 * Receives all inbound WhatsApp events from Omniflow.
 * Handles two distinct flows:
 *  A) OTP reply → complete phone linking (WhatsApp verified)
 *  B) Regular chat message → fetch context → AI reply → intent enforce → PII filter → send
 *
 * Security:
 *  - HMAC-SHA256 signature validation on every request
 *  - Idempotency via wamid dedup in whatsapp_message_logs
 *  - PII sanitisation on all outbound AI text
 *  - Intent enforcement (3 allowed topics only)
 */

// Supabase admin client (bypasses RLS — service role only)
let _admin;
function getAdmin() {
  if (!_admin) _admin = createAdminClient();
  return _admin;
}

// -------------------------------------------------------------------
// Signature validation
// -------------------------------------------------------------------
async function validateSignature(req, rawBody) {
  const secret = process.env.OMNIFLOW_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[omniflow-webhook] OMNIFLOW_WEBHOOK_SECRET not set — skipping validation');
    return true; // Soft-fail in dev; harden for prod by returning false
  }

  const signature = req.headers.get('x-omniflow-signature') ||
    req.headers.get('x-hub-signature-256') ||
    req.headers.get('signature');

  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const sigBuffer = Buffer.from(signature.replace('sha256=', ''), 'hex');
  const expBuffer = Buffer.from(expected, 'hex');

  if (sigBuffer.length !== expBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}

// -------------------------------------------------------------------
// Financial context fetcher
// -------------------------------------------------------------------
async function getFinancialContext(userId) {
  const admin = getAdmin();

  const [walletRes, profileRes, txRes] = await Promise.all([
    admin
      .from('customer_wallets')
      .select('balance_paise')
      .eq('user_id', userId)
      .maybeSingle(),

    admin
      .from('user_profiles')
      .select('kyc_status, full_name')
      .eq('id', userId)
      .single(),

    admin
      .from('customer_wallet_transactions')
      .select('type, amount_paise, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const walletBalance = walletRes.data?.balance_paise ?? 0;
  const balanceRs = (walletBalance / 100).toFixed(2);
  const kycStatus = profileRes.data?.kyc_status || 'Pending';
  const fullName = profileRes.data?.full_name || 'Customer';
  const firstName = fullName.split(' ')[0] || 'Customer';

  const txList = (txRes.data || [])
    .map(
      (t, i) =>
        `${i + 1}. ${t.type} ₹${(t.amount_paise / 100).toFixed(2)} — ${t.description || 'N/A'}`
    )
    .join(', ') || 'No recent transactions';

  return {
    contextBlock: `User financial context for InTrust India customer:\n- Wallet balance: ₹${balanceRs}\n- KYC status: ${kycStatus}\n- Last 3 transactions: ${txList}`,
    walletBalance,
    kycStatus,
    firstName,
  };
}

// -------------------------------------------------------------------
// Log helper
// -------------------------------------------------------------------
async function logMessage({ userId, phoneHash, wamid, direction, channel, status, contentPreview }) {
  const admin = getAdmin();
  await admin.from('whatsapp_message_logs').insert({
    user_id: userId || null,
    phone_hash: phoneHash,
    wamid: wamid || null,
    direction,
    message_type: 'text',
    channel,
    status,
    content_preview: contentPreview ? contentPreview.substring(0, 100) : null,
  });
}

// -------------------------------------------------------------------
// Main handler
// -------------------------------------------------------------------
export async function POST(req) {
  try {
    const rawBody = await req.text();

    // --- Signature check ---
    const isValid = await validateSignature(req, rawBody);
    if (!isValid) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new NextResponse('Bad Request', { status: 400 });
    }

    // Omniflow payload shape: { phone, message, type, wamid, timestamp }
    const { phone: rawPhone, message: userMessage, type: msgType, wamid } = payload;

    if (!rawPhone || !userMessage) {
      return new NextResponse('OK', { status: 200 }); // Delivery receipts etc.
    }

    const admin = getAdmin();
    const normalised = normalisePhone(rawPhone);
    const phoneHash = crypto.createHash('sha256').update(normalised).digest('hex');

    // --- Idempotency: skip duplicate webhooks by wamid ---
    if (wamid) {
      const { data: existing } = await admin
        .from('whatsapp_message_logs')
        .select('id')
        .eq('wamid', wamid)
        .maybeSingle();

      if (existing) {
        return new NextResponse('OK', { status: 200 });
      }
    }

    // --- Log inbound message ---
    await logMessage({
      phoneHash,
      wamid,
      direction: 'inbound',
      channel: 'whatsapp',
      status: 'delivered',
      contentPreview: userMessage,
    });

    // -------------------------------------------------------------------
    // FLOW A: Check if this is an OTP reply for phone linking
    // -------------------------------------------------------------------
    const trimmedMessage = userMessage.trim();
    const isNumericSixDigit = /^\d{6}$/.test(trimmedMessage);

    if (isNumericSixDigit) {
      const candidateHash = hashOTP(trimmedMessage);

      const { data: otpRecord, error: otpError } = await admin
        .from('whatsapp_otp_codes')
        .select('id, user_id, expires_at, is_used')
        .eq('phone', normalised)
        .eq('otp_hash', candidateHash)
        .eq('is_used', false)
        .maybeSingle();

      if (!otpError && otpRecord && new Date(otpRecord.expires_at) > new Date()) {
        // Valid OTP — link the phone
        const { error: bindError } = await admin
          .from('user_channel_bindings')
          .upsert({
            user_id: otpRecord.user_id,
            phone: normalised,
            whatsapp_opt_in: true,
            linked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (bindError) {
          console.error('[omniflow-webhook] Binding insert error:', bindError);
          await sendWhatsAppMessage(
            normalised,
            'Something went wrong linking your WhatsApp. Please try again from the website.'
          );
        } else {
          // Mark OTP as used
          await admin
            .from('whatsapp_otp_codes')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

          // Insert in-app notification for WhatsApp linking
          try {
            await admin.from('notifications').insert({
              user_id: otpRecord.user_id,
              title: 'WhatsApp Connected ✅',
              body: "Your WhatsApp number has been linked. You'll now receive order updates and alerts via WhatsApp.",
              type: 'success',
              reference_type: 'whatsapp_connected',
            });
          } catch {
            // Non-fatal
          }

          // Send welcome template (plain text won't work — no 24-hour window yet)
          const confirmMsg =
            '✅ Your WhatsApp has been successfully linked to your InTrust India account.\n\n' +
            'You can now use this chat to:\n' +
            '• Check your wallet balance\n' +
            '• View your KYC verification status\n' +
            '• Review recent transactions\n\n' +
            'Simply send us a message and our assistant will respond instantly.\n' +
            'For detailed account management, visit: intrustindia.com';
          await sendTemplateMessage(
            normalised,
            WELCOME_TEMPLATE.name,
            WELCOME_TEMPLATE.language,
            WELCOME_TEMPLATE.buildComponents()
          );
          await logMessage({
            userId: otpRecord.user_id,
            phoneHash,
            direction: 'outbound',
            channel: 'whatsapp',
            status: 'delivered',
            contentPreview: confirmMsg,
          });
        }

        return new NextResponse('OK', { status: 200 });
      }

      // Looks like an OTP attempt but doesn't match
      if (isNumericSixDigit) {
        const errMsg = 'Invalid or expired OTP. Please request a new code from the InTrust website.';
        await sendWhatsAppMessage(normalised, errMsg);
        await logMessage({ phoneHash, direction: 'outbound', channel: 'whatsapp', status: 'delivered', contentPreview: errMsg });
        return new NextResponse('OK', { status: 200 });
      }
    }

    // -------------------------------------------------------------------
    // FLOW B: Regular chat message
    // -------------------------------------------------------------------

    // Lookup binding (needed by both quick-reply and chat handlers)
    const { data: binding } = await admin
      .from('user_channel_bindings')
      .select('user_id')
      .eq('phone', normalised)
      .maybeSingle();

    if (!binding) {
      const notLinkedMsg = 'Please link your WhatsApp first by visiting intrustindia.com → Profile → Connect WhatsApp.';
      await sendWhatsAppMessage(normalised, notLinkedMsg);
      await logMessage({ phoneHash, direction: 'outbound', channel: 'whatsapp', status: 'delivered', contentPreview: notLinkedMsg });
      return new NextResponse('OK', { status: 200 });
    }

    const userId = binding.user_id;

    // -------------------------------------------------------------------
    // FLOW B.1: Quick Reply button responses (instant — no AI call needed)
    // -------------------------------------------------------------------
    const quickReplyMap = {
      'check balance':      null, // handled below with live data
      'my kyc status':      null, // handled below with live data
      'not me':             '⚠️ We have flagged this activity. Please visit intrustindia.com/profile immediately to secure your account and contact our support team.',
      'view details':       null, // handled below with live data
      'this was me':        '✅ Great, no action needed. Stay safe and keep your account secure!',
      'secure my account':  '🔐 Please visit intrustindia.com/profile right away to review your security settings and active sessions.',
    };

    const msgLower = trimmedMessage.toLowerCase();

    if (msgLower in quickReplyMap) {
      let quickReply = quickReplyMap[msgLower];

      // For responses that need live data, fetch financial context
      if (!quickReply) {
        const { walletBalance, kycStatus } = await getFinancialContext(userId);
        const balanceRs = (walletBalance / 100).toFixed(2);

        if (msgLower === 'check balance' || msgLower === 'view details') {
          quickReply = `💰 Your current InTrust wallet balance is *₹${balanceRs}*. For full transaction history, visit intrustindia.com/wallet`;
        } else if (msgLower === 'my kyc status') {
          const statusEmoji = { Verified: '✅', Pending: '⏳', Rejected: '❌' }[kycStatus] || '❓';
          quickReply = `📋 Your KYC verification status is: *${kycStatus}* ${statusEmoji}. For more details, visit intrustindia.com/profile`;
        }
      }

      if (quickReply) {
        await sendWhatsAppMessage(normalised, quickReply);
        await logMessage({
          userId,
          phoneHash,
          direction: 'outbound',
          channel: 'whatsapp',
          status: 'delivered',
          contentPreview: quickReply,
        });
        return new NextResponse('OK', { status: 200 });
      }
    }

    const { contextBlock, walletBalance, kycStatus } = await getFinancialContext(userId);

    // Intent enforcement (fast path — no AI call needed for recognized intents)
    const intentResponse = enforceIntent(userMessage, { walletBalance, kycStatus });

    let finalReply;

    if (intentResponse) {
      // Use intent-enforced response directly (no AI call)
      finalReply = intentResponse;
    } else {
      // Fallback: call Omniflow AI agent
      try {
        const aiReply = await sendMessageToAgent(normalised, contextBlock, userMessage);
        // PII sanitize + intent check on AI response
        const sanitized = sanitizeMessage(aiReply);
        finalReply = enforceIntent(sanitized, { walletBalance, kycStatus }) || sanitized;
      } catch (aiErr) {
        console.error('[omniflow-webhook] AI call failed:', aiErr);
        finalReply = 'For further help, please visit intrustindia.com or contact our support team.';
      }
    }

    // Apply PII filter as final safety net
    finalReply = sanitizeMessage(finalReply);

    await sendWhatsAppMessage(normalised, finalReply);
    await logMessage({
      userId,
      phoneHash,
      direction: 'outbound',
      channel: 'whatsapp',
      status: 'delivered',
      contentPreview: finalReply,
    });

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[omniflow-webhook] Unhandled error:', err);
    // Always return 200 to Omniflow to prevent retries
    return new NextResponse('OK', { status: 200 });
  }
}
