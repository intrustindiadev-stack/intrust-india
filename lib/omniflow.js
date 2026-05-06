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
 * Send a plain text WhatsApp message.
 * Only works within the 24-hour reply window.
 *
 * @param {string} phone  - Phone in any format; normalised internally.
 * @param {string} message - Plain text body.
 * @returns {Promise<{ success: boolean, messageId?: string }>}
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
  return { success: true, messageId: data?.id || data?.message_id || null };
}

/**
 * Send a pre-approved WhatsApp message template.
 * Required for outbound messages outside the 24-hour window.
 *
 * @param {string} phone
 * @param {string} templateName   - Must match approved template name in Meta.
 * @param {string} language       - e.g. 'en'
 * @param {Array}  components     - Omniflow components array with parameters.
 * @returns {Promise<{ success: boolean, messageId?: string }>}
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
  return { success: true, messageId: data?.id || data?.message_id || null };
}

/**
 * Send a message through Omniflow's AI Agent endpoint.
 * The agent uses OpenRouter LLM + any Knowledge Base configured in the dashboard.
 * We prepend the financial context as the first message so the AI has user data.
 *
 * @param {string} phone        - Normalised phone of the user.
 * @param {string} contextBlock - Stringified financial context to prepend.
 * @param {string} userMessage  - The raw message from the user.
 * @returns {Promise<string>}   - The AI's reply text.
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
  // Omniflow returns the AI reply in `data.message` or `data.reply` depending on version
  return data?.message || data?.reply || data?.response || '';
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
 * Defines the Meta-approved WhatsApp template used for phone linking.
 *
 * ─── META TEMPLATE DETAILS ──────────────────────────────────────────────────
 *   Template Name : intrust_otp_verification
 *   Category      : Authentication
 *   Language      : English (en)  ← manually created in Meta, NOT en_US
 *   Header        : (none)
 *   Body          :
 *     *{{1}}* is your InTrust India verification code.
 *     This code is valid for 10 minutes. Do not share this code with anyone.
 *   Footer        : InTrust India | intrustindia.com
 *   Buttons       : URL button (Copy Code / autofill) at index 0
 *                   The OTP is passed as the URL suffix parameter.
 *   Variables     : {{1}} = 6-digit OTP code
 * ────────────────────────────────────────────────────────────────────────────
 *
 * IMPORTANT: Meta authentication templates require BOTH body AND button
 * components to be sent — sending only body causes error #132001.
 * Language must be 'en' to match what was manually submitted to Meta.
 */
export const OTP_TEMPLATE = {
  name: 'intrust_otp_auth',
  language: 'en_US',
  /**
   * Build the Omniflow components array for the OTP template.
   * Matches the format confirmed working by Omniflow support:
   *   - body: passes OTP as {{1}}
   *   - button (url, index 0): passes OTP as the URL suffix
   *
   * @param {string|number} otpCode - The 6-digit OTP to send.
   * @returns {Array} Omniflow components array.
   */
  buildComponents: (otpCode) => {
    const code = String(otpCode);
    return [
      {
        type: 'body',
        parameters: [{ type: 'text', text: code }],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [{ type: 'text', text: code }],
      },
    ];
  },
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
      LOGIN_ALERT_TEMPLATE.name
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
