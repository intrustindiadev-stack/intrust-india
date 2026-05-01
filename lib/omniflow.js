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
 * Template spec (create this in Omniflow Dashboard → Templates → Create New):
 *   Name:     intrust_otp_verification
 *   Category: Authentication
 *   Language: en
 *   Body:     Your InTrust verification code is: {{1}}.
 *             This code will expire in 10 minutes. Do not share it with anyone.
 *   Variables: {{1}} = 6-digit OTP code
 *
 * After creating, submit to Meta for approval (24–48 hours).
 * Once approved, this constant is used by /api/whatsapp/link-phone.
 */
export const OTP_TEMPLATE = {
  name: 'intrust_otp_verification',
  language: 'en',
  /**
   * Build the Omniflow components array for the OTP template.
   * @param {string|number} otpCode - The 6-digit OTP to send.
   * @returns {Array} Omniflow components array.
   */
  buildComponents: (otpCode) => ([
    {
      type: 'body',
      parameters: [{ type: 'text', text: String(otpCode) }],
    },
  ]),
};

/**
 * Check if the OTP template is approved in Meta.
 * Call this from an admin health-check route or during startup.
 * @returns {Promise<{ approved: boolean, status: string }>}
 */
export async function checkTemplateStatus() {
  assertConfig();
  try {
    const res = await fetch(`${BASE_URL}/api/wpbox/gettemplates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    });
    if (!res.ok) return { approved: false, status: 'api_error' };
    const data = await res.json();
    const templates = data?.templates || data?.data || [];
    const otp = templates.find(t => t.name === OTP_TEMPLATE.name);
    if (!otp) return { approved: false, status: 'not_found' };
    const approved = otp.status?.toLowerCase() === 'approved';
    return { approved, status: otp.status || 'unknown' };
  } catch {
    return { approved: false, status: 'fetch_error' };
  }
}
