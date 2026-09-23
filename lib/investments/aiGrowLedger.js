import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Credits a merchant's AI Grow vault ledger for a confirmed deposit.
 *
 * Single choke point for the system invariant:
 *   ai_grow_wallets.balance == sum(active merchant_investments principals)
 *
 * The adjust_merchant_investment_wallet RPC auto-creates the wallet row on
 * first credit, so this is safe for merchants with no prior wallet.
 *
 * Safe to retry: RPC failure must trigger the caller's rollback path.
 *
 * @param {object} opts
 * @param {string} opts.merchantId
 * @param {number} opts.amountRupees - deposit amount in rupees (NUMERIC 14,2)
 * @param {string} opts.gatewayTxnId - idempotency/reference of the deposit
 * @param {string} opts.source - 'wallet_pay' | 'sabpaisa_fulfillment' | 'admin_investment_create'
 * @returns {Promise<{ok: boolean, error?: string, data?: object}>}
 */
export async function creditAiGrowVaultForDeposit({ merchantId, amountRupees, gatewayTxnId, source }) {
    const admin = createAdminClient();

    if (!merchantId || !(Number(amountRupees) > 0)) {
        return { ok: false, error: 'Invalid merchant or amount for AI Grow vault credit.' };
    }

    const sourceLabel =
        source === 'sabpaisa_fulfillment' ? 'payment gateway'
        : source === 'wallet_pay' ? 'merchant wallet'
        : source;

    const { data, error } = await admin.rpc('adjust_merchant_investment_wallet', {
        p_merchant_id: merchantId,
        p_adjustment_type: 'credit',
        p_amount: Number(Number(amountRupees).toFixed(2)),
        p_admin_id: null, // system credit, not a manual admin action
        p_reason: `AI Grow deposit credited to vault ledger via ${sourceLabel}.`,
        p_metadata: {
            source,
            gateway_txn_id: gatewayTxnId || null,
            credited_at: new Date().toISOString(),
        },
    });

    if (error) {
        console.error('[aiGrowLedger] vault credit RPC failed:', error);
        return { ok: false, error: error.message || 'AI Grow vault ledger credit failed.' };
    }

    return { ok: true, data };
}