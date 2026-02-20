import { getServiceSupabase } from './client';

/**
 * Creates a new transaction record.
 */
export const createTransaction = async (data) => {
    const supabase = getServiceSupabase();
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
 */
export const updateTransaction = async (clientTxnId, updates) => {
    const supabase = getServiceSupabase();
    const { error, data } = await supabase
        .from('transactions')
        .update(updates)
        .eq('client_txn_id', clientTxnId)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Gets a transaction by client transaction ID.
 */
export const getTransactionByClientTxnId = async (clientTxnId) => {
    const supabase = getServiceSupabase();
    const { error, data } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_txn_id', clientTxnId)
        .single();

    if (error) return null;
    return data;
};

/**
 * Logs a transaction event for debugging.
 */
export const logTransactionEvent = async (clientTxnId, eventType, payload, message = '') => {
    try {
        const supabase = getServiceSupabase();
        await supabase.from('transaction_logs').insert([{
            client_txn_id: clientTxnId,
            event_type: eventType,
            payload: payload, // Supabase handles JSON/object conversion usually, but safe to verify
            message: message
        }]);
    } catch (error) {
        console.error('Failed to log transaction event:', error);
        // Do not throw, logging failure shouldn't stop the flow
    }
};
