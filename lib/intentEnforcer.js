/**
 * lib/intentEnforcer.js
 * Enforces the 3 permitted intents for the InTrust chatbot.
 * Runs AFTER the AI call as a safety override layer.
 *
 * Permitted intents:
 *  1. Wallet balance query
 *  2. KYC status query
 *  3. Everything else → fallback redirect
 *
 * userContext shape:
 *  {
 *    walletBalance: number,  // in paise (from customer_wallets.balance_paise)
 *    kycStatus: string,      // from user_profiles.kyc_status
 *    firstName: string,
 *  }
 */

const BALANCE_KEYWORDS = [
  'wallet', 'balance', 'how much', 'paisa', 'rupees', 'rs.', 'rs ', 'money',
  'funds', 'amount', 'credit', 'bakaya', 'kitna'
];

const KYC_KEYWORDS = [
  'kyc', 'verification', 'verified', 'verify', 'document', 'documents',
  'identity', 'id proof', 'aadhar', 'aadhaar', 'pan', 'status'
];

const FALLBACK =
  'For further help, please visit intrustindia.com or contact our support team.';

/**
 * Detects intent from user message and returns a safe, scoped response.
 * If no recognized intent → returns fallback.
 *
 * @param {string} userMessage
 * @param {{ walletBalance: number, kycStatus: string, firstName: string }} userContext
 * @returns {string | null} A response string if intent matched, null if AI reply should be used.
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

  // No recognized intent — return fallback instead of AI response
  return FALLBACK;
}

export { FALLBACK };
