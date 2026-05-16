import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Creates a new transaction record.
 */
export const createTransaction = async (data) => {
    const supabase = createAdminClient();
    const { error, data: result } = await supabase
        .from('transactions')
        .insert([data])
        .select()
        .single();

    if (error) throw error;
    return result;
};

/**
 * Updates a transaction by client transaction ID.
 * Uses maybeSingle() instead of single() so it returns null (not throws)
 * when no matching row is found — prevents the callback outer catch from
 * firing unnecessarily when a transaction record was never created.
 */
export const updateTransaction = async (clientTxnId, updates) => {
    const supabase = createAdminClient();
    const { error, data } = await supabase
        .from('transactions')
        .update(updates)
        .eq('client_txn_id', clientTxnId)
        .select()
        .maybeSingle();

    if (error) throw error;
    if (!data) {
        console.warn(`[updateTransaction] No transaction found for clientTxnId=${clientTxnId}. Record may not have been created at initiation.`);
    }
    return data;
};

/**
 * Gets a transaction by client transaction ID.
 * Returns null on not-found or error (never throws).
 */
export const getTransactionByClientTxnId = async (clientTxnId) => {
    const supabase = createAdminClient();
    const { error, data } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_txn_id', clientTxnId)
        .maybeSingle();

    if (error) {
        console.error(`[getTransactionByClientTxnId] DB error for clientTxnId=${clientTxnId}:`, error.message);
        return null;
    }
    return data; // null if not found, object if found
};

/**
 * Logs a transaction event for debugging/audit.
 * Distinguishes FK violation (23503) from other failures so ops can quickly
 * identify callbacks arriving for transactions not yet in the DB.
 */
export const logTransactionEvent = async (clientTxnId, eventType, payload, message = '') => {
    try {
        const supabase = createAdminClient();
        const { error } = await supabase.from('transaction_logs').insert([{
            client_txn_id: clientTxnId,
            event_type: eventType,
            payload: payload,
            message: message
        }]);

        if (error) {
            if (error.code === '23503') {
                // Foreign key violation: the clientTxnId doesn't exist in transactions.
                // This means Sabpaisa sent a callback for a transaction that was never
                // initiated on this platform, OR the initiate step failed before INSERT.
                console.error(
                    `[logTransactionEvent] FK violation (23503) — clientTxnId="${clientTxnId}" not found in transactions table. ` +
                    `Sabpaisa may have sent a callback for an unrecognised or pre-initiation-failed transaction.`,
                    { eventType, message }
                );
            } else {
                console.error(`[logTransactionEvent] Failed to log event for clientTxnId="${clientTxnId}":`, error.message, { code: error.code });
            }
        }
    } catch (caughtError) {
        console.error('[logTransactionEvent] Unexpected exception:', caughtError);
        // Do not throw — logging failure must never stop the payment flow
    }
};
