import SabpaisaClient from '../../../lib/sabpaisa/client';
import { getTransactionByClientTxnId, updateTransaction, logTransactionEvent } from '../../../lib/supabase/queries';
import { getServiceSupabase } from '../../../lib/supabase/client';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientTxnId } = req.query;
    if (!clientTxnId) {
        return res.status(400).json({ error: 'Missing clientTxnId' });
    }

    // Auth check recommended here manually or rely on RLS if user context is passed
    // For simplicity, we assume this endpoint might be called by client or admin

    try {
        const transaction = await getTransactionByClientTxnId(clientTxnId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Call Sabpaisa Status API
        const statusResponse = await SabpaisaClient.verifyTransaction(clientTxnId);

        // Log verification attempt
        await logTransactionEvent(clientTxnId, 'VERIFY', statusResponse, 'Manual Verification');

        // Update DB if status changed
        // Note: In a real scenario, map statusResponse fields to DB fields
        // This depends on what verifyTransaction actually returns (which was a placeholder)

        // Example:
        // const newStatus = mapStatusToInternal(statusResponse.statusCode);
        // if (transaction.status !== newStatus) {
        //    await updateTransaction(clientTxnId, { status: newStatus, ... });
        // }

        res.status(200).json({
            latestStatus: transaction.status, // or newStatus
            gatewayResponse: statusResponse
        });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
}
