/**
 * lib/omniflow.js
 * Shared utility for all Omniflow WhatsApp API calls.
 * Server-side only — never import in client components.
 *
 * API base: https://whatsapp.ominiflow.com
 * Docs: https://documenter.getpostman.com/view/8538142/2s9Ykn8gvj
 */

const BASE_URL = process.env.OMNIFLOW_BASE_URL;
const TOKEN = process.env.OMNIFLOW_API_TOKEN;

if (!BASE_URL || !TOKEN) {
  console.warn('[omniflow] WARNING: Missing OMNIFLOW_BASE_URL or OMNIFLOW_API_TOKEN in environment. WhatsApp integration will fail when invoked.');
}

/**
 * Validate env config once at module load (fails fast).
 * We only throw at call time so Next.js can still build without these vars.
 */
function assertConfig() {
  if (!BASE_URL || !TOKEN) {
    throw new Error(
      '[omniflow] Missing OMNIFLOW_BASE_URL or OMNIFLOW_API_TOKEN env vars.'
    );
  }
}

/**
 * Structured error class representing validation/provider failures from Omniflow/Meta.
 */
export class OmniflowError extends Error {
  constructor(message, code, rawSnippet) {
    super(message);
    this.name = 'OmniflowError';
    this.code = code;
    this.rawSnippet = rawSnippet;
  }
}

/**
 * Validate the parsed JSON response body from Omniflow/Meta endpoints.
 * Classifies as failure if:
 *  - success: false
 *  - error key is present (string or object)
 *  - status is 'error' or 'failed'
 *  - no success identifier (id / message_id / messages[]) for messages,
 *    or additionally (message / reply / response) for agent.
 */
function validateResponseBody(data, isAgent = false) {
  if (!data || typeof data !== 'object') {
    return { isError: true, message: 'Invalid or empty response body', code: undefined };
  }

  // 1. success === false
  if (data.success === false) {
    return { isError: true, message: 'Provider reported failure (success is false)', code: undefined };
  }

  // 2. error present
  if (data.error !== undefined && data.error !== null) {
    let message = 'Provider error';
    let code;
    if (typeof data.error === 'object') {
      message = data.error.message || JSON.stringify(data.error);
      code = data.error.code;
    } else if (typeof data.error === 'string') {
      message = data.error;
    }
    return { isError: true, message, code };
  }

  // 3. status is error or failed
  if (data.status === 'error' || data.status === 'failed') {
    return { isError: true, message: `Provider status: ${data.status}`, code: undefined };
  }

  // 4. no success identifier
  let hasSuccessIdentifier = false;
  if (isAgent) {
    hasSuccessIdentifier = !!(
      data.id ||
      data.message_id ||
      (Array.isArray(data.messages) && data.messages.length > 0) ||
      data.message ||
      data.reply ||
      data.response
    );
  } else {
    hasSuccessIdentifier = !!(
      data.id ||
      data.message_id ||
      (Array.isArray(data.messages) && data.messages.length > 0)
    );
  }

  if (!hasSuccessIdentifier) {
    return { isError: true, message: 'Missing success identifier in response', code: undefined };
  }

  return { isError: false };
}

/**
 * Send a plain text WhatsApp message.
 * Only works within the 24-hour reply window.
 *
 * @param {string} phone  - Phone in any format; normalised internally.
 * @param {string} message - Plain text body.
 * @returns {Promise<{ success: boolean, messageId?: string, raw: any }>}
 */
export async function sendWhatsAppMessage(phone, message) {
  assertConfig();
  const normalised = normalisePhone(phone);

  const res = await fetch(`${BASE_URL}/api/wpbox/sendmessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: TOKEN,
      phone: normalised,
      message,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[omniflow] sendmessage failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const validation = validateResponseBody(data, false);
  if (validation.isError) {
    const rawSnippet = JSON.stringify(data).slice(0, 200);
    throw new OmniflowError(validation.message, validation.code, rawSnippet);
  }

  const messageId = data?.id || data?.message_id || (Array.isArray(data?.messages) && data.messages[0]?.id) || null;
  return { success: true, messageId, raw: data };
}

/**
 * Send a pre-approved WhatsApp message template.
 * Required for outbound messages outside the 24-hour window.
 *
 * @param {string} phone
 * @param {string} templateName   - Must match approved template name in Meta.
 * @param {string} language       - e.g. 'en'
 * @param {Array}  components     - Omniflow components array with parameters.
 * @returns {Promise<{ success: boolean, messageId?: string, raw: any }>}
 */
export async function sendTemplateMessage(phone, templateName, language, components) {
  assertConfig();
  const normalised = normalisePhone(phone);

  const res = await fetch(`${BASE_URL}/api/wpbox/sendtemplatemessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: TOKEN,
      phone: normalised,
      template_name: templateName,
      template_language: language,
      components,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[omniflow] sendtemplatemessage failed (${res.status}): ${text}`
    );
  }

  const data = await res.json();
  const validation = validateResponseBody(data, false);
  if (validation.isError) {
    const rawSnippet = JSON.stringify(data).slice(0, 200);
    throw new OmniflowError(validation.message, validation.code, rawSnippet);
  }

  const messageId = data?.id || data?.message_id || (Array.isArray(data?.messages) && data.messages[0]?.id) || null;
  return { success: true, messageId, raw: data };
}

/**
 * Send a message through Omniflow's AI Agent endpoint.
 * The agent uses OpenRouter LLM + any Knowledge Base configured in the dashboard.
 * We prepend the financial context as the first message so the AI has user data.
 *
 * @param {string} phone        - Normalised phone of the user.
 * @param {string} contextBlock - Stringified financial context to prepend.
 * @param {string} userMessage  - The raw message from the user.
 * @returns {Promise<string>}   - The AI's reply text (as a String wrapper with raw attached).
 */
export async function sendMessageToAgent(phone, contextBlock, userMessage) {
  assertConfig();
  const normalised = normalisePhone(phone);

  // We send context + user message as the payload so the AI has all the info.
  const combinedMessage = `${contextBlock}\n\nUser question: ${userMessage}`;

  const res = await fetch(`${BASE_URL}/api/wpbox/sendMessageToAgent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: TOKEN,
      phone: normalised,
      message: combinedMessage,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `[omniflow] sendMessageToAgent failed (${res.status}): ${text}`
    );
  }

  const data = await res.json();
  const validation = validateResponseBody(data, true);
  if (validation.isError) {
    const rawSnippet = JSON.stringify(data).slice(0, 200);
    throw new OmniflowError(validation.message, validation.code, rawSnippet);
  }

  const replyText = data?.message || data?.reply || data?.response || '';
  const wrapper = new String(replyText);
  wrapper.raw = data;
  return wrapper;
}

/**
 * Normalise a phone string to E.164 format (+91XXXXXXXXXX).
 * Handles Indian numbers with or without country code.
 *
 * @param {string} phone
 * @returns {string} E.164 formatted phone
 */
export function normalisePhone(phone) {
  if (!phone) throw new Error('[omniflow] Phone number is required');
  // Strip everything except digits and leading +
  let digits = phone.replace(/[^\d]/g, '');
  // If 10 digits, assume India (+91)
  if (digits.length === 10) return `+91${digits}`;
  // If 12 digits starting with 91, add +
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  // If already has + prefix (stripped above), reconstruct
  if (phone.startsWith('+')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * OTP_TEMPLATE
 * Sent to deliver a one-time password via WhatsApp (Authentication category).
 * Gated by the WHATSAPP_OTP_ENABLED feature flag in the request-otp route.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_otp_verification
 *   Category      : Authentication
 *   Language      : English (U.S.) — en_US
 *   Header        : (none)
 *   Body          :
 *     🔐 *Secure Login — InTrust India*
 *
 *     Your one-time verification code is: *{{1}}*
 *
 *     This code is valid for 5 minutes. Do not share this code with anyone.
 *     InTrust will never ask for your OTP via call, SMS, or email.
 *
 *     If you did not request this code, please ignore this message or
 *     contact support at intrustindia.com.
 *   Footer        : InTrust India | Secure Authentication
 *   Buttons       : [Copy Code] — OTP value delivered via copy-code button
 *   Variables     :
 *     {{1}} = OTP code (e.g. "482913")
 *     Button 0 parameter = OTP code (same value)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * IMPORTANT: Meta Authentication templates deliver the code via a copy-code
 * BUTTON component, not a plain body variable. The components shape below
 * must match exactly what is submitted/approved in Omniflow/Meta.
 */
export const OTP_TEMPLATE = {
  name: 'intrust_otp_verification',
  language: 'en_US',
  /**
   * @param {string} otp - The one-time password to deliver.
   * @returns {Array} Omniflow components array with body + button parameters.
   */
  buildComponents: (otp) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(otp) },
      ],
    },
    {
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [
        { type: 'text', text: String(otp) },
      ],
    },
  ]),
};


/**
 * WELCOME_TEMPLATE
 * Sent immediately after a user successfully links their WhatsApp account.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_welcome_linked
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     ✅ Your WhatsApp has been successfully linked to your InTrust India account.
 *
 *     You can now use this chat to:
 *     • Check your wallet balance
 *     • View your KYC verification status
 *     • Review recent transactions
 *
 *     Simply send us a message and our assistant will respond instantly.
 *     For detailed account management, visit: intrustindia.com
 *   Footer        : InTrust India | Your Trusted Financial Partner
 *   Buttons       : (none)
 *   Variables     : (none)
 * ────────────────────────────────────────────────────────────────────────────
 */
export const WELCOME_TEMPLATE = {
  name: 'intrust_welcome_linked',
  language: 'en_US',
  /**
   * Quick Reply buttons configured in Omniflow dashboard:
   *   Button 1 text: "Check Balance"
   *   Button 2 text: "My KYC Status"
   */
  buildComponents: () => ([]), // No body variables; buttons are dashboard-configured
};

/**
 * KYC_UPDATE_TEMPLATE
 * Sent when a user's KYC verification status changes.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_kyc_update
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     📋 *KYC Verification Update — InTrust India*
 *
 *     Your KYC status has been updated to: *{{1}}*
 *
 *     {{2}}
 *
 *     If you have questions about your KYC status, please visit your profile
 *     at intrustindia.com or reply to this message for assistance.
 *   Footer        : InTrust India | Regulated & Secure
 *   Buttons       : (none)
 *   Variables     :
 *     {{1}} = KYC status (e.g. "Verified ✅", "Pending Review ⏳", "Rejected ❌")
 *     {{2}} = Action note (e.g. "You are now fully verified and can access all
 *             features." or "Please resubmit your Aadhaar card photo.")
 * ────────────────────────────────────────────────────────────────────────────
 */
export const KYC_UPDATE_TEMPLATE = {
  name: 'intrust_kyc_update',
  language: 'en_US',
  buildComponents: (status, note) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(status) },
        { type: 'text', text: String(note) },
      ],
    },
  ]),
};

/**
 * TRANSACTION_ALERT_TEMPLATE
 * Sent when a wallet transaction (credit or debit) occurs.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_transaction_alert
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     💸 *Transaction Alert — InTrust India*
 *
 *     ₹{{1}} has been {{2}} your InTrust wallet.
 *
 *     Updated Balance: *₹{{3}}*
 *
 *     If you did not authorise this transaction, please contact our support
 *     team immediately at intrustindia.com or reply HELP.
 *   Footer        : InTrust India | Secure Wallet
 *   Buttons       : (none)
 *   Variables     :
 *     {{1}} = Transaction amount (e.g. "500.00")
 *     {{2}} = Direction (e.g. "credited to" or "debited from")
 *     {{3}} = Wallet balance after transaction (e.g. "4,500.00")
 * ────────────────────────────────────────────────────────────────────────────
 */
export const TRANSACTION_ALERT_TEMPLATE = {
  name: 'intrust_transaction_alert',
  language: 'en_US',
  /**
   * Quick Reply buttons configured in Omniflow dashboard:
   *   Button 1 text: "Not Me"
   *   Button 2 text: "View Details"
   * Call to Action button: "View Wallet" → https://intrustindia.com/wallet
   */
  buildComponents: (amount, action, balance) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(amount) },
        { type: 'text', text: String(action) },
        { type: 'text', text: String(balance) },
      ],
    },
  ]),
};

/**
 * LOGIN_ALERT_TEMPLATE
 * Sent whenever a new login session is detected on the user's account.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_login_alert
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     🔐 *Security Alert — InTrust India*
 *
 *     A new login was detected on your InTrust account.
 *
 *     📍 Location / Device: {{1}}
 *     🕐 Time: {{2}}
 *
 *     If this was you, no action is needed.
 *     If you do *not* recognise this activity, please secure your account
 *     immediately by visiting intrustindia.com or replying HELP.
 *   Footer        : InTrust India | Account Security
 *   Buttons       : (none)
 *   Variables     :
 *     {{1}} = Location or device info (e.g. "Chrome on Windows, Mumbai, IN")
 *     {{2}} = Timestamp (e.g. "04 May 2026, 09:43 AM IST")
 * ────────────────────────────────────────────────────────────────────────────
 */
export const LOGIN_ALERT_TEMPLATE = {
  name: 'intrust_login_alert',
  language: 'en_US',
  /**
   * Quick Reply buttons configured in Omniflow dashboard:
   *   Button 1 text: "This Was Me"
   *   Button 2 text: "Secure My Account"
   * Call to Action button: "Secure Account" → https://intrustindia.com/profile
   */
  buildComponents: (location, time) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(location) },
        { type: 'text', text: String(time) },
      ],
    },
  ]),
};


// ─────────────────────────────────────────────────────────────────────────────
// MARKETING TEMPLATES (User-facing, Category: Marketing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GM_GREET_TEMPLATE
 * Morning engagement message sent to users — personalised greeting with
 * a soft CTA to open their InTrust wallet.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_gm_greet_v1
 *   Category      : Marketing
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     ☀️ Good Morning, *{{1}}*!
 *
 *     A new day is a new opportunity to grow your finances. 💰
 *
 *     Your InTrust wallet is safe, secure, and always ready for you.
 *     Check your balance, review recent transactions, or explore
 *     what's new — all in one place.
 *
 *     Have a productive and prosperous day! 🚀
 *   Footer        : InTrust India | Your Trusted Financial Partner
 *   Buttons       : [Quick Reply] Check My Balance, [Quick Reply] Recent Transactions
 *   Variables     :
 *     {{1}} = First name of the user (e.g. "Rahul")
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} firstName - User's first name
 * @returns {Array} Omniflow components array
 */
export const GM_GREET_TEMPLATE = {
  name: 'intrust_gm_greet_v1',
  language: 'en_US',
  buildComponents: (firstName) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(firstName) },
      ],
    },
  ]),
};

/**
 * GM_TIP_TEMPLATE
 * Morning financial tip broadcast — motivational money insight with a
 * dynamic tip body to keep users engaged with the InTrust brand.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_gm_tip_v1
 *   Category      : Marketing
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     🌅 *Good Morning from InTrust India!*
 *
 *     💡 *Today's Financial Tip:*
 *     {{1}}
 *
 *     Small, consistent steps lead to lasting financial freedom.
 *     Your InTrust account is the perfect place to start. 🌱
 *   Footer        : InTrust India | Smart Money Habits
 *   Buttons       : [Quick Reply] Explore Features, [Quick Reply] My Wallet
 *   Variables     :
 *     {{1}} = Financial tip text
 *             e.g. "Set aside 20% of every income before spending.
 *                   Automate it so you never forget."
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} tip - Today's financial tip text
 * @returns {Array} Omniflow components array
 */
export const GM_TIP_TEMPLATE = {
  name: 'intrust_gm_tip_v1',
  language: 'en_US',
  buildComponents: (tip) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(tip) },
      ],
    },
  ]),
};


/**
 * MERCHANT_WELCOME_LINKED_TEMPLATE
 * Sent immediately after a merchant successfully links their WhatsApp account.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_welcome_linked
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     🤝 *Welcome to InTrust India Merchant Services*
 *
 *     Your WhatsApp has been successfully linked. You will now receive real-time business alerts and transaction notifications directly here.
 *
 *     *You'll stay updated on:*
 *     • New Order Alerts 🛍️
 *     • Payout & Settlement Status 💸
 *     • Store Credit Requests 📝
 *     • Security & Account Updates 🔐
 *
 *     We're excited to have you onboard!
 *   Footer        : InTrust India | Merchant Partner
 *   Buttons       : [Quick Reply] View Dashboard, [Quick Reply] My Balance
 *   Variables     : (none)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_WELCOME_LINKED_TEMPLATE = {
  name: 'intrust_merchant_welcome_linked',
  language: 'en_US',
  buildComponents: () => ([]),
};

/**
 * MERCHANT_NEW_ORDER_TEMPLATE
 * Sent when a new order is received at the merchant's store.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_new_order
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     🛍️ *New Order Received!*
 *
 *     A new order has been placed at your store.
 *
 *     *Order ID*: {{1}}
 *     *Total Amount*: ₹{{2}}
 *     *Items Count*: {{3}}
 *
 *     Please review the order details and begin processing to ensure timely delivery.
 *   Footer        : InTrust India | Order Management
 *   Buttons       : [Quick Reply] View Order Details, [Quick Reply] Manage Orders
 *   Variables     : 
 *     {{1}} = Order ID
 *     {{2}} = Amount
 *     {{3}} = Items Count
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} orderShortId - Order ID
 * @param {string} amountRs - Amount
 * @param {string} itemCount - Items Count
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_NEW_ORDER_TEMPLATE = {
  name: 'intrust_merchant_new_order',
  language: 'en_US',
  buildComponents: (orderShortId, amountRs, itemCount) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(orderShortId) },
        { type: 'text', text: String(amountRs) },
        { type: 'text', text: String(itemCount) },
      ],
    },
  ]),
};

/**
 * MERCHANT_PROCUREMENT_SALE_TEMPLATE
 * Sent when a platform procurement order is completed.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_procurement_sale
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     🤝 *New Procurement Sale*
 *
 *     Platform procurement order completed.
 *
 *     *Procurement ID*: {{1}}
 *     *Amount*: ₹{{2}}
 *     *Items*: {{3}}
 *   Footer        : InTrust India | Procurement
 *   Buttons       : [Quick Reply] View Details
 *   Variables     : 
 *     {{1}} = Procurement ID
 *     {{2}} = Amount Credited
 *     {{3}} = Items
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} procurementShortId - Procurement ID
 * @param {string} amountRs - Amount Credited
 * @param {string} itemCount - Items
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_PROCUREMENT_SALE_TEMPLATE = {
  name: 'intrust_merchant_procurement_sale',
  language: 'en_US',
  buildComponents: (procurementShortId, amountRs, itemCount) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(procurementShortId) },
        { type: 'text', text: String(amountRs) },
        { type: 'text', text: String(itemCount) },
      ],
    },
  ]),
};

/**
 * MERCHANT_ORDER_CANCELLED_TEMPLATE
 * Sent when a merchant order is cancelled.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_order_cancelled
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     ❌ *Order Cancellation Alert*
 *
 *     The following order has been cancelled:
 *
 *     *Order ID*: {{1}}
 *     *Reason*: {{2}}
 *
 *     No further action is required for this order. If items were already packed, please return them to inventory.
 *   Footer        : InTrust India | Inventory Update
 *   Buttons       : [Quick Reply] View Order, [Quick Reply] Contact Support
 *   Variables     : 
 *     {{1}} = Order ID
 *     {{2}} = Reason
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} orderShortId - Order ID
 * @param {string} reason - Reason
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_ORDER_CANCELLED_TEMPLATE = {
  name: 'intrust_merchant_order_cancelled',
  language: 'en_US',
  buildComponents: (orderShortId, reason) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(orderShortId) },
        { type: 'text', text: String(reason) },
      ],
    },
  ]),
};

/**
 * MERCHANT_PAYOUT_STATUS_TEMPLATE
 * Sent when a settlement job updates the status of a merchant payout.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_payout_status
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     💸 *Payout Processed Successfully*
 *
 *     Your settlement has been initiated.
 *
 *     *Amount*: ₹{{1}}
 *     *Status*: *{{2}}*
 *     *Reference*: {{3}}
 *
 *     Funds usually reflect in your registered bank account within 24-48 hours.
 *   Footer        : InTrust India | Secure Settlements
 *   Buttons       : [Quick Reply] Settlement History, [Quick Reply] My Bank Details
 *   Variables     : 
 *     {{1}} = Amount
 *     {{2}} = Status
 *     {{3}} = Reference/Note
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} amountRs - Amount
 * @param {string} status - Status
 * @param {string} note - Reference/Note
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_PAYOUT_STATUS_TEMPLATE = {
  name: 'intrust_merchant_payout_status',
  language: 'en_US',
  buildComponents: (amountRs, status, note) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(amountRs) },
        { type: 'text', text: String(status) },
        { type: 'text', text: String(note) },
      ],
    },
  ]),
};

/**
 * MERCHANT_PAYOUT_REQUESTED_TEMPLATE
 * Sent when a payout request is initiated.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_payout_requested
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     💸 *Payout Requested*
 *
 *     A new payout request has been received.
 *
 *     *Amount*: ₹{{1}}
 *     *Source*: {{2}}
 *
 *     We are processing your request and will notify you upon settlement.
 *   Footer        : InTrust India | Secure Settlements
 *   Buttons       : [Quick Reply] View Payouts
 *   Variables     : 
 *     {{1}} = Amount
 *     {{2}} = Source
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} amountRs - Amount
 * @param {string} source - Source
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_PAYOUT_REQUESTED_TEMPLATE = {
  name: 'intrust_merchant_payout_requested',
  language: 'en_US',
  buildComponents: (amountRs, source) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(amountRs) },
        { type: 'text', text: String(source) },
      ],
    },
  ]),
};

/**
 * MERCHANT_STORE_CREDIT_REQUEST_TEMPLATE
 * Sent when a customer requests to use store credit for an order.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_store_credit_request
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     📝 *New Store Credit Request*
 *
 *     A customer has requested to use store credit for a purchase.
 *
 *     *Customer*: {{1}}
 *     *Amount*: ₹{{2}}
 *     *Item/Order*: {{3}}
 *
 *     Please approve or decline this request from your merchant panel.
 *   Footer        : InTrust India | Credit Management
 *   Buttons       : [Quick Reply] Review Request, [Quick Reply] View All Requests
 *   Variables     : 
 *     {{1}} = Customer
 *     {{2}} = Amount
 *     {{3}} = Item/Order
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} customerName - Customer
 * @param {string} amountRs - Amount
 * @param {string} item - Item/Order
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_STORE_CREDIT_REQUEST_TEMPLATE = {
  name: 'intrust_merchant_store_credit_request',
  language: 'en_US',
  buildComponents: (customerName, amountRs, item) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(customerName) },
        { type: 'text', text: String(amountRs) },
        { type: 'text', text: String(item) },
      ],
    },
  ]),
};

/**
 * MERCHANT_STORE_CREDIT_PAID_TEMPLATE
 * Sent when store credit settlement is confirmed.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_store_credit_paid
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     ✅ *Store Credit Settlement Confirmed*
 *
 *     The credit for the following item has been successfully settled to your balance.
 *
 *     *Amount*: ₹{{1}}
 *     *Item*: {{2}}
 *
 *     Thank you for supporting our store credit program.
 *   Footer        : InTrust India | Ledger Update
 *   Buttons       : [Quick Reply] View Ledger, [Quick Reply] Recent Credits
 *   Variables     : 
 *     {{1}} = Amount
 *     {{2}} = Item
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} amountRs - Amount
 * @param {string} item - Item
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_STORE_CREDIT_PAID_TEMPLATE = {
  name: 'intrust_merchant_store_credit_paid',
  language: 'en_US',
  buildComponents: (amountRs, item) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(amountRs) },
        { type: 'text', text: String(item) },
      ],
    },
  ]),
};

/**
 * MERCHANT_GIFT_CARD_SOLD_TEMPLATE
 * Sent when a digital gift card is purchased from the merchant's brand.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_gift_card_sold
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     🎁 *Gift Card Sold!*
 *
 *     A new digital gift card has been purchased from your brand.
 *
 *     *Revenue*: ₹{{1}}
 *     *Brand*: {{2}}
 *
 *     The funds have been added to your merchant wallet.
 *   Footer        : InTrust India | Voucher Sales
 *   Buttons       : [Quick Reply] View Sales Report, [Quick Reply] My Wallet
 *   Variables     : 
 *     {{1}} = Revenue
 *     {{2}} = Brand
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} amountRs - Revenue
 * @param {string} brand - Brand
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_GIFT_CARD_SOLD_TEMPLATE = {
  name: 'intrust_merchant_gift_card_sold',
  language: 'en_US',
  buildComponents: (amountRs, brand) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(amountRs) },
        { type: 'text', text: String(brand) },
      ],
    },
  ]),
};

/**
 * MERCHANT_BANK_VERIFIED_TEMPLATE
 * Sent when a merchant's bank account details have been successfully verified.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_bank_verified
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     🏦 *Bank Verification Successful*
 *
 *     Your bank account details have been verified by our compliance team.
 *
 *     You are now eligible to receive automated payouts directly to this account.
 *   Footer        : InTrust India | Compliance Verified
 *   Buttons       : [Quick Reply] View Bank Details, [Quick Reply] Profile Settings
 *   Variables     : (none)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_BANK_VERIFIED_TEMPLATE = {
  name: 'intrust_merchant_bank_verified',
  language: 'en_US',
  buildComponents: () => ([]),
};

/**
 * MERCHANT_APPROVED_TEMPLATE
 * Sent when a merchant onboarding application is approved.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_approved_v3
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     ✅ Your merchant account has been approved.
 *
 *     Business: *{{1}}*
 *
 *     *Action Required*: {{2}}
 *
 *     Log in to your merchant dashboard to complete your setup.
 *   Footer        : InTrust India | Merchant Services
 *   Buttons       : [Quick Reply] Go to Dashboard, [Quick Reply] View Setup Steps
 *   Variables     :
 *     {{1}} = Business Name
 *     {{2}} = Action Required (e.g. "Complete your bank verification to receive payouts.")
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} businessName - Business Name
 * @param {string} nextStep - Action Required instruction
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_APPROVED_TEMPLATE = {
  name: 'intrust_merchant_approved_v3',
  language: 'en_US',
  buildComponents: (businessName, nextStep) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(businessName) },
        { type: 'text', text: String(nextStep) },
      ],
    },
  ]),
};

/**
 * MERCHANT_SUBSCRIPTION_STATUS_TEMPLATE
 * Sent when a merchant's subscription status changes (activated, expired, or lapsed).
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_subscription_status_v3
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     📋 *Merchant Subscription Notice — InTrust India*
 *
 *     Your subscription status has been updated.
 *
 *     *Status*: *{{1}}*
 *     *Valid Until*: {{2}}
 *
 *     For queries regarding your subscription, please contact support or
 *     log in to your account at intrustindia.com.
 *   Footer        : InTrust India | Account Services
 *   Buttons       : [Quick Reply] View Subscription, [Quick Reply] Contact Support
 *   Variables     :
 *     {{1}} = Status (e.g. "Active ✅", "Expired ❌", "Unpaid ⚠️")
 *     {{2}} = Valid Until date (e.g. "31 Dec 2026")
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} status - Subscription status label
 * @param {string} expiry - Valid Until date string
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_SUBSCRIPTION_STATUS_TEMPLATE = {
  name: 'intrust_merchant_subscription_status_v3',
  language: 'en_US',
  buildComponents: (status, expiry) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(status) },
        { type: 'text', text: String(expiry) },
      ],
    },
  ]),
};

/**
 * MERCHANT_PRODUCT_APPROVED_TEMPLATE
 * Sent when a merchant's product submission is audited and an approval decision is made.
 *
 * ─── OMNIFLOW TEMPLATE SPEC ─────────────────────────────────────────────────
 *   Template Name : intrust_merchant_product_approved
 *   Category      : Utility
 *   Language      : English
 *   Header        : (none)
 *   Body          :
 *     📦 *Product Catalog Update*
 *
 *     Our review team has finished auditing your product submission.
 *
 *     *Product*: {{1}}
 *     *Decision*: *{{2}}*
 *     *Note*: {{3}}
 *
 *     Thank you for maintaining our quality standards.
 *   Footer        : InTrust India | Quality Assurance
 *   Buttons       : [Quick Reply] View Product, [Quick Reply] Edit Catalog
 *   Variables     : 
 *     {{1}} = Product
 *     {{2}} = Decision
 *     {{3}} = Note
 * ────────────────────────────────────────────────────────────────────────────
 *
 * @param {string} title - Product
 * @param {string} decision - Decision
 * @param {string} reason - Note
 * @returns {Array} Omniflow components array
 */
export const MERCHANT_PRODUCT_APPROVED_TEMPLATE = {
  name: 'intrust_merchant_product_approved',
  language: 'en_US',
  buildComponents: (title, decision, reason) => ([
    {
      type: 'body',
      parameters: [
        { type: 'text', text: String(title) },
        { type: 'text', text: String(decision) },
        { type: 'text', text: String(reason) },
      ],
    },
  ]),
};

/**
 * Check the approval status of ALL defined templates in Meta.
 * Call this to see which templates are ready to use.
 * @returns {Promise<Array<{ name: string, status: string, approved: boolean }>>}
 */
export async function getAllTemplateStatuses() {
  assertConfig();
  try {
    const res = await fetch(`${BASE_URL}/api/wpbox/gettemplates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[omniflow] gettemplates failed (${res.status}): ${text}`);
      return [];
    }
    const data = await res.json();
    const templates = data?.templates || data?.data || [];

    const tracked = [
      OTP_TEMPLATE.name,
      WELCOME_TEMPLATE.name,
      KYC_UPDATE_TEMPLATE.name,
      TRANSACTION_ALERT_TEMPLATE.name,
      LOGIN_ALERT_TEMPLATE.name,
      GM_GREET_TEMPLATE.name,
      GM_TIP_TEMPLATE.name,
      MERCHANT_WELCOME_LINKED_TEMPLATE.name,
      MERCHANT_NEW_ORDER_TEMPLATE.name,
      MERCHANT_PROCUREMENT_SALE_TEMPLATE.name,
      MERCHANT_ORDER_CANCELLED_TEMPLATE.name,
      MERCHANT_PAYOUT_STATUS_TEMPLATE.name,
      MERCHANT_PAYOUT_REQUESTED_TEMPLATE.name,
      MERCHANT_STORE_CREDIT_REQUEST_TEMPLATE.name,
      MERCHANT_STORE_CREDIT_PAID_TEMPLATE.name,
      MERCHANT_GIFT_CARD_SOLD_TEMPLATE.name,
      MERCHANT_BANK_VERIFIED_TEMPLATE.name,
      MERCHANT_APPROVED_TEMPLATE.name,
      MERCHANT_SUBSCRIPTION_STATUS_TEMPLATE.name,
      MERCHANT_PRODUCT_APPROVED_TEMPLATE.name
    ];

    return tracked.map(name => {
      const t = templates.find(tpl => tpl.name === name);
      return {
        name,
        status: t?.status || 'not_found',
        approved: t?.status?.toLowerCase() === 'approved',
      };
    });
  } catch (error) {
    console.error('[omniflow] Error checking template statuses:', error);
    return [];
  }
}
