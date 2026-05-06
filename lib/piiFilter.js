/**
 * lib/piiFilter.js
 *
 * Sanitises AI-generated text by detecting and masking Indian PII patterns.
 * Used in both backend routes and the frontend ChatWindow before rendering.
 *
 * Patterns detected:
 *  - Aadhaar number: 12 digits optionally grouped as XXXX XXXX XXXX,
 *    with non-digit word-boundary guards to reduce false positives on
 *    large amounts (e.g. ₹1,23,45,678 does NOT match).
 *  - PAN number: AAAAA9999A format.
 *
 * Two exported functions:
 *  - sanitizeMessage(text)  — legacy; keeps the "wipe whole reply" behaviour
 *    so the ChatWindow client-side check stays safe.
 *  - maskPII(text)           — new; replaces the matched substring in place
 *    (keeps last 4 digits of Aadhaar visible, masks PAN except mid-digits).
 *    Used by the API route so false positives don't wipe entire answers.
 */

// Aadhaar: 12 consecutive digits grouped as XXXX XXXX XXXX or XXXXXXXXXXXX.
// Non-digit lookbehind/lookahead prevents matching subsets of larger numbers
// (amounts, transaction IDs, phone numbers with dialling code, etc.)
const AADHAAR_REGEX = /(?<!\d)(\d{4}[\s-]?\d{4}[\s-]?\d{4})(?!\d)/g;

// PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
const PAN_REGEX = /\b([A-Z]{5}[0-9]{4}[A-Z])\b/g;

export const FALLBACK_MESSAGE =
  "I can't share that information here. Please visit your profile page for secure details.";

// ─── Helpers ───────────────────────────────────────────────────────────────

function _resetRegex() {
  AADHAAR_REGEX.lastIndex = 0;
  PAN_REGEX.lastIndex = 0;
}

function _hasPII(text) {
  _resetRegex();
  const hasAadhaar = AADHAAR_REGEX.test(text);
  _resetRegex();
  const hasPan = PAN_REGEX.test(text);
  _resetRegex();
  return hasAadhaar || hasPan;
}

// ─── Exports ───────────────────────────────────────────────────────────────

/**
 * Legacy sanitizer — if PII is detected, replaces the *entire* text with
 * the fallback message. Preserves existing client-side behaviour in ChatWindow.
 *
 * @param {string} text
 * @returns {string}
 */
export function sanitizeMessage(text) {
  if (!text || typeof text !== 'string') return text;
  return _hasPII(text) ? FALLBACK_MESSAGE : text;
}

/**
 * In-place PII masker — replaces only the detected substring, not the whole reply.
 * Aadhaar → keeps last 4 digits: "XXXX XXXX 5678"
 * PAN     → keeps middle 4 digits: "XXXXX1234X"
 *
 * Use this in server-side route responses so a transaction reference like
 * "₹1,23,456" doesn't wipe the entire reply.
 *
 * @param {string} text
 * @returns {string}
 */
export function maskPII(text) {
  if (!text || typeof text !== 'string') return text;

  // Mask Aadhaar — keep last 4 digits
  _resetRegex();
  let result = text.replace(AADHAAR_REGEX, (match) => {
    const digits = match.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    return `XXXX XXXX ${last4}`;
  });

  // Mask PAN — keep middle 4 digits (positions 5–8), mask positions 0–4 and 9
  _resetRegex();
  result = result.replace(PAN_REGEX, (match) => {
    // PAN format: AAAAA9999A → XXXXX9999X
    const mid4 = match.slice(5, 9);
    return `XXXXX${mid4}X`;
  });

  return result;
}
