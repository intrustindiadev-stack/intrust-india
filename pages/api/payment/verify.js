import SabpaisaClient from '../../../lib/sabpaisa/client';
import { getTransactionByClientTxnId, updateTransaction, logTransactionEvent } from '../../../lib/supabase/queries';
import { mapStatusToInternal } from '../../../lib/sabpaisa/utils';
import { createClient } from '@supabase/supabase-js';

// Helper to get user from Authorization header
async function getUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return null;
    }

    return user;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientTxnId } = req.query;
    if (!clientTxnId) {
        return res.status(400).json({ error: 'Missing clientTxnId' });
    }

    // Authentication — require logged-in user
    const user = await getUserFromRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized — please log in' });
    }

    try {
        const transaction = await getTransactionByClientTxnId(clientTxnId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Authorization — users can only verify their own transactions
        if (transaction.user_id !== user.id) {
            return res.status(403).json({ error: 'Forbidden — this transaction does not belong to you' });
        }

        // Call Sabpaisa Status Inquiry API
        const statusResponse = await SabpaisaClient.verifyTransaction(clientTxnId);

        // Log verification attempt
        await logTransactionEvent(clientTxnId, 'VERIFY', statusResponse, 'Manual Verification');

        // Update DB if status changed and is more definitive
        if (statusResponse.internalStatus && statusResponse.internalStatus !== 'ERROR') {
            const newStatus = statusResponse.internalStatus;
            if (transaction.status !== newStatus && transaction.status !== 'SUCCESS') {
                // Only update to a more final state (don't overwrite SUCCESS)
                await updateTransaction(clientTxnId, {
                    status: newStatus,
                    sabpaisa_txn_id: statusResponse.sabpaisaTxnId || transaction.sabpaisa_txn_id,
                    sabpaisa_message: statusResponse.message || transaction.sabpaisa_message,
                    status_code: statusResponse.statusCode || transaction.status_code,
                    paid_amount: statusResponse.paidAmount || transaction.paid_amount,
                    payment_mode: statusResponse.paymentMode || transaction.payment_mode
                });
                console.log(`[Verify] Transaction ${clientTxnId} updated: ${transaction.status} → ${newStatus}`);
            }
        }

        // Return the latest known status (prefer gateway, fall back to DB)
        const latestStatus = (statusResponse.internalStatus && statusResponse.internalStatus !== 'ERROR')
            ? statusResponse.internalStatus
            : transaction.status;

        res.status(200).json({
            latestStatus,
            dbStatus: transaction.status,
            gatewayStatus: statusResponse.internalStatus || statusResponse.status,
            gatewayResponse: statusResponse
        });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
}
