import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabaseServer';
import { hashOTP } from '@/lib/otpUtils';
import { sendWhatsAppMessage, sendMessageToAgent, normalisePhone, sendTemplateMessage, WELCOME_TEMPLATE, MERCHANT_WELCOME_LINKED_TEMPLATE } from '@/lib/omniflow';
import { sanitizeMessage } from '@/lib/piiFilter';
import { enforceIntent } from '@/lib/intentEnforcer';
import { buildMerchantContext, formatMerchantContextForPrompt } from '@/lib/chat/merchantBuildContext';

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
 * 
 * CHANNEL ASYMMETRY DOCUMENTATION:
 * - Web Chat (Merchant Dashboard): Uses Gemini AI directly via /api/merchant/chat/message.
 * - WhatsApp Channel (Merchant & Customer): Uses Omniflow Agent via sendMessageToAgent.
 * This is intentional to leverage Omniflow's WhatsApp-native automation and session management.
 */

/**
 * POST /api/webhooks/omniflow
 *
 * Receives all inbound WhatsApp events from Omniflow.
 * Handles two distinct flows:
 *  A) OTP reply -> complete phone linking (WhatsApp verified)
 *  B) Regular chat message -> fetch context -> AI reply (Omniflow Agent) -> PII filter -> send
 *
 * Security:
 *  - HMAC-SHA256 signature validation on every request
 *  - Idempotency via wamid dedup in whatsapp_message_logs
 *  - PII sanitisation on all outbound AI text
 *  - Audience resolution: Prefer merchant if role matches; fallback to customer.
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
async function logMessage({ userId, phoneHash, wamid, direction, channel, status, contentPreview, audience = 'customer' }) {
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
    audience,
  });
}

// -------------------------------------------------------------------
// Merchant Inbound Handler
// -------------------------------------------------------------------
async function handleMerchantInbound({ userId, normalised, phoneHash, trimmedMessage }) {
  let contextBlock = "Merchant context unavailable.";
  let ctx = null;

  try {
    ctx = await buildMerchantContext(getAdmin(), userId);
    contextBlock = formatMerchantContextForPrompt(ctx);
  } catch (err) {
    console.error('[omniflow-webhook] Merchant context build failed:', err);
  }

  // Merchant Quick Replies
  const MERCHANT_QUICK_REPLIES = {
    "today's orders": (c) => `📦 *Today's Orders:* ${c.recentOrders.length} orders found.\nPending Fulfillments: ${c.pendingFulfillmentsCount}\n\nManage here: intrustindia.com/merchant/shopping/orders`,
    "todays orders": (c) => `📦 *Today's Orders:* ${c.recentOrders.length} orders found.\nPending Fulfillments: ${c.pendingFulfillmentsCount}\n\nManage here: intrustindia.com/merchant/shopping/orders`,
    "my orders": (c) => `📦 *Recent Orders:* ${c.recentOrders.length} total orders.\nPending Fulfillments: ${c.pendingFulfillmentsCount}\n\nManage here: intrustindia.com/merchant/shopping/orders`,
    "my payouts": (c) => `💰 *Payout Status:* \n- Pending Payouts: ${c.pendingPayoutsCount}\n- Total Pending: ₹${c.pendingPayoutsTotalRs}\n- Last Payout: ${c.lastPayoutStatus}\n\nView wallet: intrustindia.com/merchant/wallet`,
    "payout": (c) => `💰 *Payout Status:* \n- Pending Payouts: ${c.pendingPayoutsCount}\n- Total Pending: ₹${c.pendingPayoutsTotalRs}\n- Last Payout: ${c.lastPayoutStatus}\n\nView wallet: intrustindia.com/merchant/wallet`,
    "withdrawal": (c) => `💰 *Payout Status:* \n- Pending Payouts: ${c.pendingPayoutsCount}\n- Total Pending: ₹${c.pendingPayoutsTotalRs}\n- Last Payout: ${c.lastPayoutStatus}\n\nView wallet: intrustindia.com/merchant/wallet`,
    "sales summary": (c) => `📈 *Sales Summary:* \n- Wallet Balance: ₹${c.walletBalanceRs}\n- Total Commission Paid: ₹${c.totalCommissionPaidRs}\n- Recent Orders: ${c.recentOrders.length}\n\nAnalytics: intrustindia.com/merchant/analytics`,
    "sales": (c) => `📈 *Sales Summary:* \n- Wallet Balance: ₹${c.walletBalanceRs}\n- Total Commission Paid: ₹${c.totalCommissionPaidRs}\n- Recent Orders: ${c.recentOrders.length}\n\nAnalytics: intrustindia.com/merchant/analytics`,
    "low stock": (c) => `🛡️ *Inventory:* \n- Live Items: ${c.liveInventoryCount}\n- Low Stock Alerts: ${c.lowStockCount}\n\nManage Stock: intrustindia.com/merchant/shopping/inventory`,
    "inventory": (c) => `🛡️ *Inventory:* \n- Live Items: ${c.liveInventoryCount}\n- Low Stock Alerts: ${c.lowStockCount}\n\nManage Stock: intrustindia.com/merchant/shopping/inventory`,
    "subscription status": (c) => `⭐ *Subscription:* \n- Plan: ${c.subscriptionStatus}\n\nManage: intrustindia.com/merchant/settings`,
    "subscription": (c) => `⭐ *Subscription:* \n- Plan: ${c.subscriptionStatus}\n\nManage: intrustindia.com/merchant/settings`,
    "plan": (c) => `⭐ *Subscription:* \n- Plan: ${c.subscriptionStatus}\n\nManage: intrustindia.com/merchant/settings`,
    "kyc status": (c) => `🆔 *Identity Verification:* \n- KYC Status: ${c.kycStatus}\n- Bank Verified: ${c.bankVerified ? '✅' : '❌'}\n\nProfile: intrustindia.com/merchant/profile`,
    "kyc": (c) => `🆔 *Identity Verification:* \n- KYC Status: ${c.kycStatus}\n- Bank Verified: ${c.bankVerified ? '✅' : '❌'}\n\nProfile: intrustindia.com/merchant/profile`,
    "bank status": (c) => `🆔 *Identity Verification:* \n- KYC Status: ${c.kycStatus}\n- Bank Verified: ${c.bankVerified ? '✅' : '❌'}\n\nProfile: intrustindia.com/merchant/profile`,
    "bank": (c) => `🆔 *Identity Verification:* \n- KYC Status: ${c.kycStatus}\n- Bank Verified: ${c.bankVerified ? '✅' : '❌'}\n\nProfile: intrustindia.com/merchant/profile`,
  };

  const msgLower = trimmedMessage.toLowerCase();
  const matchedKey = Object.keys(MERCHANT_QUICK_REPLIES).find(key => msgLower.includes(key));

  if (matchedKey && ctx) {
    const reply = MERCHANT_QUICK_REPLIES[matchedKey](ctx);
    await sendWhatsAppMessage(normalised, reply);
    await logMessage({
      userId,
      phoneHash,
      direction: 'outbound',
      channel: 'whatsapp',
      status: 'delivered',
      contentPreview: reply,
      audience: 'merchant',
    });
    return;
  }

  // AI Fallback
  try {
    const aiReply = await sendMessageToAgent(normalised, contextBlock, trimmedMessage);
    const sanitized = sanitizeMessage(aiReply);
    await sendWhatsAppMessage(normalised, sanitized);
    await logMessage({
      userId,
      phoneHash,
      direction: 'outbound',
      channel: 'whatsapp',
      status: 'delivered',
      contentPreview: sanitized,
      audience: 'merchant',
    });
  } catch (err) {
    console.error('[omniflow-webhook] Merchant AI call failed:', err);
    const fallback = "For help with your merchant account, please visit intrustindia.com/merchant or contact our support team.";
    await sendWhatsAppMessage(normalised, fallback);
    await logMessage({
      userId,
      phoneHash,
      direction: 'outbound',
      channel: 'whatsapp',
      status: 'delivered',
      contentPreview: fallback,
      audience: 'merchant',
    });
  }
}

// -------------------------------------------------------------------
// Customer Inbound Handler
// -------------------------------------------------------------------
async function handleCustomerInbound({ userId, normalised, phoneHash, trimmedMessage }) {
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
        audience: 'customer',
      });
      return;
    }
  }

  const { contextBlock, walletBalance, kycStatus } = await getFinancialContext(userId);
  const intentResponse = enforceIntent(trimmedMessage, { walletBalance, kycStatus });

  let finalReply;

  if (intentResponse) {
    finalReply = intentResponse;
  } else {
    try {
      const aiReply = await sendMessageToAgent(normalised, contextBlock, trimmedMessage);
      const sanitized = sanitizeMessage(aiReply);
      finalReply = enforceIntent(sanitized, { walletBalance, kycStatus }) || sanitized;
    } catch (aiErr) {
      console.error('[omniflow-webhook] Customer AI call failed:', aiErr);
      finalReply = 'For further help, please visit intrustindia.com or contact our support team.';
    }
  }

  finalReply = sanitizeMessage(finalReply);

  await sendWhatsAppMessage(normalised, finalReply);
  await logMessage({
    userId,
    phoneHash,
    direction: 'outbound',
    channel: 'whatsapp',
    status: 'delivered',
    contentPreview: finalReply,
    audience: 'customer',
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

    // Idempotency check must remain before inbound log


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
        // Fetch role to determine audience
        const { data: userProfile } = await admin
          .from('user_profiles')
          .select('role')
          .eq('id', otpRecord.user_id)
          .single();
        const role = userProfile?.role || 'customer';
        const isMerchant = ['merchant', 'admin', 'super_admin'].includes(role);
        const audience = isMerchant ? 'merchant' : 'customer';

        // Log inbound with resolved audience
        await logMessage({
          userId: otpRecord.user_id,
          phoneHash,
          wamid,
          direction: 'inbound',
          channel: 'whatsapp',
          status: 'delivered',
          contentPreview: userMessage,
          audience,
        });

        // Valid OTP — link the phone
        const { error: bindError } = await admin
          .from('user_channel_bindings')
          .upsert({
            user_id: otpRecord.user_id,
            phone: normalised,
            audience,
            whatsapp_opt_in: true,
            linked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,audience' });

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
          const template = audience === 'merchant'
            ? MERCHANT_WELCOME_LINKED_TEMPLATE
            : WELCOME_TEMPLATE;

          await sendTemplateMessage(
            normalised,
            template.name,
            template.language,
            template.buildComponents()
          );
          const confirmMsg =
            '✅ Your WhatsApp has been successfully linked to your InTrust India account.\n\n' +
            'You can now use this chat to:\n' +
            '• Check your wallet balance\n' +
            '• View your KYC verification status\n' +
            '• Review recent transactions\n\n' +
            'Simply send us a message and our assistant will respond instantly.\n' +
            'For detailed account management, visit: intrustindia.com';

          await logMessage({
            userId: otpRecord.user_id,
            phoneHash,
            direction: 'outbound',
            channel: 'whatsapp',
            status: 'delivered',
            contentPreview: confirmMsg,
            audience,
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
    const { data: bindings } = await admin
      .from('user_channel_bindings')
      .select('user_id, audience')
      .eq('phone', normalised);

    if (!bindings || bindings.length === 0) {
      const notLinkedMsg = 'Please link your WhatsApp first by visiting intrustindia.com → Profile → Connect WhatsApp.';
      await sendWhatsAppMessage(normalised, notLinkedMsg);
      await logMessage({ phoneHash, direction: 'outbound', channel: 'whatsapp', status: 'delivered', contentPreview: notLinkedMsg });
      return new NextResponse('OK', { status: 200 });
    }

    let chosen = bindings[0];
    if (bindings.length > 1) {
      // Resolve preference by querying user_profiles.role
      const userIds = bindings.map(b => b.user_id);
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('id, role')
        .in('id', userIds);

      const hasMerchant = profiles?.some(p => ['merchant', 'admin', 'super_admin'].includes(p.role));
      if (hasMerchant) {
        chosen = bindings.find(b => b.audience === 'merchant') || chosen;
      } else {
        chosen = bindings.find(b => b.audience === 'customer') || chosen;
      }
    }

    const userId = chosen.user_id;
    const audience = chosen.audience || 'customer';

    // Log inbound with resolved audience
    await logMessage({
      userId,
      phoneHash,
      wamid,
      direction: 'inbound',
      channel: 'whatsapp',
      status: 'delivered',
      contentPreview: userMessage,
      audience,
    });

    if (audience === 'merchant') {
      await handleMerchantInbound({ userId, normalised, phoneHash, trimmedMessage });
      return new NextResponse('OK', { status: 200 });
    }

    // falls through to handleCustomerInbound
    await handleCustomerInbound({ userId, normalised, phoneHash, trimmedMessage });
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[omniflow-webhook] Unhandled error:', err);
    // Always return 200 to Omniflow to prevent retries
    return new NextResponse('OK', { status: 200 });
  }
}
