/**
 * lib/piiFilter.js
 * Sanitises AI-generated text by removing Indian PII patterns.
 * Used in both backend routes and the frontend ChatWindow before rendering.
 *
 * Patterns detected:
 *  - Aadhaar number: 12 digits optionally grouped as XXXX XXXX XXXX
 *  - PAN number:     AAAAA9999A format
 */

const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g;

const FALLBACK_MESSAGE =
  "I can't share that information here. Please visit your profile page for secure details.";

/**
 * Checks a string for Aadhaar or PAN patterns.
 * If found, returns the fallback message. Otherwise returns the original text.
 *
 * @param {string} text - Any string to check (AI reply, user message, etc.)
 * @returns {string}
 */
export function sanitizeMessage(text) {
  if (!text || typeof text !== 'string') return text;

  AADHAAR_REGEX.lastIndex = 0;
  PAN_REGEX.lastIndex = 0;
  if (AADHAAR_REGEX.test(text) || PAN_REGEX.test(text)) {
    return FALLBACK_MESSAGE;
  }

  return text;
}

export { FALLBACK_MESSAGE };
