/**
 * lib/intentEnforcer.js
 *
 * Intent enforcement for the WhatsApp channel only.
 *
 * ⚠️  DEPRECATED for the WEB CHAT channel — see lib/chat/promptTemplates.js and
 *     app/api/chat/message/route.js which use Gemini directly with a full knowledge base.
 *
 * This module is retained because the WhatsApp webhook (/api/webhooks/omniflow)
 * still uses it to keep the WhatsApp bot scoped to its 3 intents.
 * Do NOT import this in the web chat route.
 *
 * userContext shape:
 *  {
 *    walletBalance: number,  // in paise (from customer_wallets.balance_paise)
 *    kycStatus: string,      // from user_profiles.kyc_status
 *    firstName?: string,
 *  }
 */

const BALANCE_KEYWORDS = [
  'wallet', 'balance', 'how much', 'paisa', 'rupees', 'rs.', 'rs ',
  'funds', 'amount', 'bakaya', 'kitna',
];

const KYC_KEYWORDS = [
  'kyc', 'verification', 'verified', 'verify', 'document', 'documents',
  'identity', 'id proof', 'aadhar', 'aadhaar', 'pan',
  'kyc status', 'complete kyc', 'submit',
];

export const FALLBACK =
  'For further help, please visit intrustindia.com or contact our support team.';

/**
 * WhatsApp-channel intent guard.
 * Returns a scoped canned reply if a recognized intent is detected,
 * or null to allow the caller's AI path to handle the message.
 *
 * @param {string} userMessage
 * @param {{ walletBalance: number, kycStatus: string }} userContext
 * @returns {string | null}
 */
export function enforceIntent(userMessage, userContext) {
  const lower = userMessage.toLowerCase();

  const isBalanceQuery = BALANCE_KEYWORDS.some((kw) => lower.includes(kw));
  const isKycQuery = KYC_KEYWORDS.some((kw) => lower.includes(kw));

  if (isBalanceQuery) {
    const balanceRs = userContext.walletBalance
      ? (userContext.walletBalance / 100).toFixed(2)
      : '0.00';
    return `Your current wallet balance is ₹${balanceRs}.`;
  }

  if (isKycQuery) {
    const status = userContext.kycStatus || 'Pending';
    return `Your KYC status is: ${status}.`;
  }

  return null;
}
