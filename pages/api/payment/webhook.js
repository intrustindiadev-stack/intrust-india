import SabpaisaClient from '../../../lib/sabpaisa/client';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '../../../lib/supabase/queries';
import { WalletService } from '../../../lib/wallet/walletService';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { encResponse } = req.body;

        if (!encResponse) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const result = SabpaisaClient.parseResponse(encResponse);
        if (!result) {
            return res.status(400).json({ error: 'Decryption failed' });
        }

        const { clientTxnId, internalStatus, message, amount, paymentMode } = result;

        await logTransactionEvent(clientTxnId, 'WEBHOOK', req.body, message);

        // Idempotency check: Don't update if already final state
        const currentTxn = await getTransactionByClientTxnId(clientTxnId);
        if (!currentTxn) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (['SUCCESS', 'FAILED', 'ABORTED'].includes(currentTxn.status)) {
            console.log(`Transaction ${clientTxnId} already in final state: ${currentTxn.status}. Ignoring webhook.`);
            return res.status(200).json({ message: 'Received' });
        }

        // Update Status
        await updateTransaction(clientTxnId, {
            status: internalStatus,
            sabpaisa_txn_id: result.sabpaisaTxnId,
            webhook_received: true,
            sabpaisa_message: message,
            paid_amount: amount,
            status_code: result.statusCode
        });

        // HANDLE WALLET CREDIT
        if (internalStatus === 'SUCCESS' && currentTxn.udf1 === 'WALLET_TOPUP') {
            try {
                // Check idempotency again via wallet logic or just rely on the fact we only do this if !final state
                // Since we checked currentTxn.status !== 'SUCCESS' above, we are safe to credit.
                await WalletService.creditWallet(
                    currentTxn.user_id,
                    amount || currentTxn.amount,
                    clientTxnId,
                    'TOPUP',
                    `Wallet Topup via Sabpaisa Webhook (${paymentMode || 'Gateway'})`
                );
            } catch (walletError) {
                console.error('Webhook: Failed to credit wallet:', walletError);
            }
        }

        // Return what Sabpaisa expects. Often just a 200 OK or specific string.
        res.status(200).json({ status: 'OK', message: 'Webhook processed' });

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
