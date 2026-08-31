// types/ai-grow.js
// Type definitions for AI Grow Merchant Investment Wallet System

/**
 * @typedef {'active' | 'frozen' | 'suspended'} WalletStatus
 */

/**
 * @typedef {'credit' | 'debit' | 'admin_adjustment'} AdjustmentType
 */

/**
 * @typedef {Object} AIGrowMerchantWallet
 * @property {string} id
 * @property {string} merchant_id
 * @property {number} balance
 * @property {string} currency
 * @property {WalletStatus} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {{
 *   id: string,
 *   business_name: string,
 *   owner_name: string,
 *   email: string,
 *   phone?: string
 * }} merchant
 */

/**
 * @typedef {Object} AIGrowWalletTransaction
 * @property {string} id
 * @property {string} wallet_id
 * @property {string} merchant_id
 * @property {string | null} admin_id
 * @property {AdjustmentType | 'yield_payout' | 'reversal'} transaction_type
 * @property {number} amount
 * @property {number} previous_balance
 * @property {number} new_balance
 * @property {string} reason
 * @property {Record<string, unknown>} metadata
 * @property {string} created_at
 * @property {{ email: string, full_name?: string }} [admin]
 */

/**
 * @typedef {Object} AdjustWalletPayload
 * @property {string} merchant_id
 * @property {AdjustmentType} adjustment_type
 * @property {number} amount
 * @property {string} reason
 */

export const WALLET_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
  SUSPENDED: 'suspended',
};

export const ADJUSTMENT_TYPE = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
};

export const TRANSACTION_TYPE_LABELS = {
  credit: 'Credit',
  debit: 'Debit',
  admin_adjustment: 'Direct Override',
  yield_payout: 'Yield Payout',
  reversal: 'Reversal',
};

export const WALLET_STATUS_COLORS = {
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  frozen: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  suspended: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
};
