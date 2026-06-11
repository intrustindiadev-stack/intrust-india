import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabaseServer';
import { sendWhatsAppMessage, sendMessageToAgent, normalisePhone } from '@/lib/omniflow';
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
// Normalize helper — lowercase, strip punctuation, collapse whitespace
// -------------------------------------------------------------------
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/['.!?,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// -------------------------------------------------------------------
// Status Mapping Helper
// -------------------------------------------------------------------
const STATUS_HIERARCHY = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
  undeliverable: 4
};

function mapOmniflowStatus(rawStatus, errorCode) {
  const s = String(rawStatus || '').toLowerCase();
  if (s === 'sent') return 'sent';
  if (s === 'delivered') return 'delivered';
  if (s === 'read') return 'read';
  if (s === 'failed' || s === 'error' || s === 'undeliverable') {
    const code = String(errorCode || '').toLowerCase();
    // Common undeliverable error codes or explicit undeliverable status
    if (s === 'undeliverable' || code === '131026') {
      return 'undeliverable';
    }
    return 'failed';
  }
  return null;
}

// -------------------------------------------------------------------
// Merchant quick-reply map (module-level, built once)
// -------------------------------------------------------------------
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

// Pre-normalised key → handler pairs, computed once at module load
const NORMALISED_MERCHANT_KEYS = Object.entries(MERCHANT_QUICK_REPLIES).map(
  ([key, handler]) => [normalize(key), handler]
);


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
async function logMessage({ userId, phoneHash, wamid, direction, channel, status, contentPreview, audience = 'customer', error_code = null, error_detail = null }) {
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
    error_code,
    error_detail,
  });
}

// -------------------------------------------------------------------
// Safe send and log wrapper
// -------------------------------------------------------------------
async function safeSendAndLog({ userId, phoneHash, wamid, normalisedPhone, messageText, audience = 'customer' }) {
  try {
    const res = await sendWhatsAppMessage(normalisedPhone, messageText);
    await logMessage({
      userId,
      phoneHash,
      wamid: res?.messageId ?? null,
      direction: 'outbound',
      channel: 'whatsapp',
      status: 'sent',
      contentPreview: messageText,
      audience,
    });
    return res;
  } catch (sendError) {
    console.error(`[omniflow-webhook] Failed to send WhatsApp message to ${normalisedPhone}:`, sendError.message);
    await logMessage({
      userId,
      phoneHash,
      wamid,
      direction: 'outbound',
      channel: 'whatsapp',
      status: 'failed',
      contentPreview: `[FAILED] ${messageText}`,
      audience,
      error_code: sendError.code || null,
      error_detail: sendError.rawSnippet || sendError.message || null,
    });
    throw sendError;
  }
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

  // Merchant Quick Replies — tokenised contiguous-span matcher
  const NEGATION_TOKENS = new Set(['not', 'dont', 'no']);
  const normMsg = normalize(trimmedMessage);
  const msgTokens = normMsg.split(' ');
  const leadingWindow = msgTokens.slice(0, 3);

  let matchedEntry = null;

  if (!leadingWindow.some(t => NEGATION_TOKENS.has(t))) {
    matchedEntry = NORMALISED_MERCHANT_KEYS.find(([normKey]) => {
      const keyTokens = normKey.split(' ');
      if (keyTokens.length > msgTokens.length) return false;
      // Check contiguous span starting at index 0, OR exact full-message match
      return keyTokens.every((kt, i) => msgTokens[i] === kt);
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[merchant-quickreply]', { message: trimmedMessage, matchedKey: matchedEntry ? matchedEntry[0] : null });
  }

  if (matchedEntry && ctx) {
    const reply = matchedEntry[1](ctx);
    try {
      await safeSendAndLog({
        userId,
        phoneHash,
        wamid: null,
        normalisedPhone: normalised,
        messageText: reply,
        audience: 'merchant'
      });
    } catch (e) {
      // non-blocking for response
    }
    return;
  }

  // AI Fallback
  let aiReply, sanitized;
  try {
    aiReply = await sendMessageToAgent(normalised, contextBlock, trimmedMessage);
    sanitized = sanitizeMessage(String(aiReply));
  } catch (err) {
    console.error('[omniflow-webhook] Merchant AI call failed:', err);
    const fallback = "For help with your merchant account, please visit intrustindia.com/merchant or contact our support team.";
    try {
      await safeSendAndLog({
        userId,
        phoneHash,
        wamid: null,
        normalisedPhone: normalised,
        messageText: fallback,
        audience: 'merchant'
      });
    } catch (e) {
      // non-blocking
    }
    return;
  }

  try {
    await safeSendAndLog({
      userId,
      phoneHash,
      wamid: null,
      normalisedPhone: normalised,
      messageText: sanitized,
      audience: 'merchant'
    });
  } catch (e) {
    // non-blocking
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
      try {
        await safeSendAndLog({
          userId,
          phoneHash,
          wamid: null,
          normalisedPhone: normalised,
          messageText: quickReply,
          audience: 'customer'
        });
      } catch (e) {
        // non-blocking
      }
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
      const sanitized = sanitizeMessage(String(aiReply));
      finalReply = enforceIntent(sanitized, { walletBalance, kycStatus }) || sanitized;
    } catch (aiErr) {
      console.error('[omniflow-webhook] Customer AI call failed:', aiErr);
      finalReply = 'For further help, please visit intrustindia.com or contact our support team.';
    }
  }

  finalReply = sanitizeMessage(finalReply);

  try {
    await safeSendAndLog({
      userId,
      phoneHash,
      wamid: null,
      normalisedPhone: normalised,
      messageText: finalReply,
      audience: 'customer'
    });
  } catch (e) {
    // non-blocking
  }
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

    // Omniflow payload shape: { phone, message, type, wamid, timestamp, status, error_code, error_detail }
    const { 
      phone: rawPhone, 
      message: userMessage, 
      type: msgType, 
      wamid,
      status: rawStatus,
      error_code: payloadErrorCode,
      error: payloadError,
      error_detail: payloadErrorDetail,
      reason: payloadReason
    } = payload;

    const admin = getAdmin();

    // --- Outbound Message Status Updates ---
    const isStatusEvent = msgType === 'message_status' || msgType === 'status' || rawStatus;
    
    if (isStatusEvent && wamid) {
      const errorCode = payloadErrorCode || payloadError || null;
      const errorDetail = payloadErrorDetail || payloadReason || null;
      const mappedStatus = mapOmniflowStatus(rawStatus, errorCode);

      if (mappedStatus) {
        const { data: existing } = await admin
          .from('whatsapp_message_logs')
          .select('id, status')
          .eq('wamid', wamid)
          .maybeSingle();

        if (!existing) {
          console.warn(`[omniflow-webhook] Unknown wamid for status update: ${wamid}`);
          return new NextResponse('OK', { status: 200 });
        }

        const currentRank = STATUS_HIERARCHY[existing.status] ?? -1;
        const newRank = STATUS_HIERARCHY[mappedStatus] ?? -1;

        if (newRank > currentRank) {
          await admin
            .from('whatsapp_message_logs')
            .update({
              status: mappedStatus,
              error_code: errorCode,
              error_detail: errorDetail,
            })
            .eq('wamid', wamid);
        }
      }

      return new NextResponse('OK', { status: 200 });
    }

    // --- Inbound Messages ---
    if (!rawPhone || !userMessage) {
      return new NextResponse('OK', { status: 200 }); // Other unrecognized events
    }

    const normalised = normalisePhone(rawPhone);
    const phoneHash = crypto.createHash('sha256').update(normalised).digest('hex');

    // --- Idempotency: skip duplicate inbound webhooks by wamid ---
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


    const trimmedMessage = userMessage.trim();

    // -------------------------------------------------------------------
    // FLOW B: Regular chat message
    // -------------------------------------------------------------------

    // Lookup binding (needed by both quick-reply and chat handlers)
    const { data: bindings } = await admin
      .from('user_channel_bindings')
      .select('user_id, audience')
      .eq('phone', normalised);

    if (!bindings || bindings.length === 0) {
      const notLinkedMsg = 'Your phone number is not yet linked to an InTrust India account. Please sign up or log in at intrustindia.com to get started.';
      try {
        await safeSendAndLog({
          userId: null,
          phoneHash,
          wamid: null,
          normalisedPhone: normalised,
          messageText: notLinkedMsg,
          audience: 'customer'
        });
      } catch (e) {
        // non-blocking
      }
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
