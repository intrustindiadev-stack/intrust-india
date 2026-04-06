/**
 * Shared utility for handling transaction amounts and constants.
 */

export const COMPLETED_STATUSES = ['completed', 'SUCCESS'];

/**
 * Normalizes a transaction record's amount to paise.
 * @param {Object} transaction - The transaction object from Supabase.
 * @returns {number} Amount in paise.
 */
export function getAmountPaise(transaction) {
  if (!transaction) return 0;
  
  // Prefer total_paid_paise if present (even if 0)
  if (transaction.total_paid_paise !== undefined && transaction.total_paid_paise !== null) {
    return Number(transaction.total_paid_paise);
  }
  
  // Fallback to amount (rupees) converted to paise
  if (transaction.amount !== undefined && transaction.amount !== null) {
    return Math.round(Number(transaction.amount) * 100);
  }
  
  return 0;
}
