/**
 * lib/notifications/whatsappConstants.js
 *
 * System constants, sentinel values, and quote pools for WhatsApp broadcasts.
 * Separate from 'use server' action files so constants and synchronous utilities
 * can be exported cleanly without violating Next.js server actions rules.
 */

// ─── Deterministic system sentinel for audit rows ───────────────────────────
/**
 * Deterministic system sentinel for broadcast audit rows in whatsapp_message_logs.
 * - Satisfies `phone_hash TEXT NOT NULL` constraint without weakening the database schema.
 * - Non-hex string that will never collide with a recipient's 64-character SHA-256 phone hash.
 * - Preserves per-recipient deduplication queries (.eq('phone_hash', sha256)).
 * - Combined with user_id: null, it cleanly identifies system-level broadcast execution records.
 */
export const SYSTEM_BROADCAST_PHONE_HASH = 'SYSTEM_BROADCAST_AUDIT';

// ─── Approved Fallback Daily Quotes Pool ─────────────────────────────────────
/**
 * Approved, neutral daily quotes used as a safe fallback when no custom quote
 * has been scheduled by an admin in the daily_quotes table.
 * Strictly compliant with Meta WhatsApp Marketing category policies:
 * - NO financial advice, NO investment tips, NO wealth promises.
 * - General uplifting, positive, and professional daily thoughts.
 */
export const FALLBACK_DAILY_QUOTES = [
  'Every morning brings new potential; it will take whatever shape you decide to give it.',
  'Small daily improvements over time lead to stunning long-term results.',
  'Start each day with a clear mind, positive energy, and a focus on what matters most.',
  'Opportunities don\'t just happen; you create them through steady dedication.',
  'Believe in your progress, celebrate small wins, and keep moving forward.',
  'The secret of getting ahead is simply getting started.',
  'A brand new day is a fresh opportunity to learn, achieve, and inspire.',
  'Success is the sum of small efforts repeated consistently day in and day out.',
  'Focus on progress rather than perfection as you take on today\'s goals.',
  'Write it on your heart that every day holds the chance to make a meaningful difference.',
  'Your dedication and positive attitude introduce you before you even begin.',
  'Kindness, resilience, and purpose pave the way forward through every challenge.',
  'Do something today that your future self will look back on with pride.',
  'A positive thought in the morning can transform the course of your entire day.',
];

/**
 * Deterministically select an approved fallback quote for a given date string (YYYY-MM-DD).
 * Guarantees that multiple broadcast calls on the same day select the exact same quote.
 *
 * @param {string} dateISO - Date string in YYYY-MM-DD format
 * @returns {string}
 */
export function getFallbackDailyQuote(dateISO) {
  let hash = 0;
  for (let i = 0; i < dateISO.length; i++) {
    hash = (hash << 5) - hash + dateISO.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_DAILY_QUOTES.length;
  return FALLBACK_DAILY_QUOTES[index];
}
