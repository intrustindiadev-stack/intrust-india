import { getTransactionByClientTxnId, updateTransaction, logTransactionEvent } from '../../../lib/supabase/queries';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { clientTxnId, amount, reason } = req.body;

    try {
        const transaction = await getTransactionByClientTxnId(clientTxnId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        // Check if eligible for refund (e.g., must be SUCCESS)
        if (transaction.status !== 'SUCCESS') {
            return res.status(400).json({ error: 'Transaction not eligible for refund' });
        }

        // Call Sabpaisa Refund API (Not implemented in client.js yet, would go here)
        // const refundResponse = await SabpaisaClient.initiateRefund(clientTxnId, amount);

        // Mock success for now
        await updateTransaction(clientTxnId, {
            refund_status: 'REQUESTED'
        });

        await logTransactionEvent(clientTxnId, 'REFUND_REQUESTED', { amount, reason }, 'Refund initiated by user/admin');

        res.status(200).json({ message: 'Refund request initiated successfully' });

    } catch (error) {
        console.error('Refund Error:', error);
        res.status(500).json({ error: 'Refund failed' });
    }
}
