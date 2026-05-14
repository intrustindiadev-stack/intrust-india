// Force Node.js runtime — uses AES-256-GCM decryption via node:crypto
// (transitively through lib/sabpaisa/encrypt.js → decrypt).
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/sabpaisa/encrypt';
import { createClient } from '@supabase/supabase-js';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '@/lib/supabase/queries';
import { mapStatusToInternal } from '@/lib/sabpaisa/utils';
import { fulfillTransaction } from '@/lib/sabpaisa/fulfillment';

const ALLOWED_IPS = (process.env.SABPAISA_ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);

export async function GET() {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function POST(request) {
    // 1. IP Whitelist check (mirrors callback behaviour)
    if (ALLOWED_IPS.length > 0) {
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';

        if (!ALLOWED_IPS.includes(clientIp)) {
            console.error(`[SabPaisa Webhook] Blocked unauthorized request from IP: ${clientIp}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    try {
        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // SabPaisa webhook uses "encryptedResponse" (different from callback's "encResponse")
        const { encryptedResponse } = body;

        if (!encryptedResponse) {
            console.error('[SabPaisa Webhook] Missing encryptedResponse. Keys received:', Object.keys(body));
            return NextResponse.json({ error: 'Invalid payload — missing encryptedResponse' }, { status: 400 });
        }

        // 2. Decrypt payload using the same GCM implementation as the callback
        const decryptedString = decrypt(encryptedResponse);
        if (!decryptedString) {
            console.error('[SabPaisa Webhook] Decryption failed');
            return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
        }

        const params = new URLSearchParams(decryptedString);
        const result = Object.fromEntries(params.entries());

        const clientTxnId = result.clientTxnId;
        const status = result.status || result.statusCode;
        const sabpaisaTxnId = result.sabpaisaTxnId || result.transId;
        const amount = result.amount;
        const paymentMode = result.paymentMode;

        let internalStatus = mapStatusToInternal(result.statusCode || status);
        console.log(`[Webhook] txn=${clientTxnId} status=${internalStatus} amount=${amount}`);

        // 3. Log webhook event
        if (clientTxnId) {
            await logTransactionEvent(clientTxnId, 'WEBHOOK', {
                statusCode: result.statusCode,
                status: result.status,
                paymentMode,
                sabpaisaTxnId
            }, result.transMsg || status);
        }

        // 4. Load existing transaction
        const existingTxn = await getTransactionByClientTxnId(clientTxnId);

        if (!existingTxn) {
            console.error(`[Webhook] No transaction found for clientTxnId="${clientTxnId}"`);
            return NextResponse.json({
                status: 404,
                message: 'Transaction not found',
                data: { statusCode: '00', message: 'Transaction not found', sabpaisaTxnId: sabpaisaTxnId || '' },
                errors: 'null'
            }, { status: 404 });
        }

        // Idempotency: Already in a terminal state
        if (['gateway_success', 'failed', 'aborted'].includes(existingTxn.status)) {
            console.log(`[Webhook] txn ${clientTxnId} already in terminal state: ${existingTxn.status}. Acknowledging.`);
            return NextResponse.json({
                status: 200,
                message: 'API_SUCCESSFULL_MESSAGE',
                data: { statusCode: '01', message: 'Data successfully processed', sabpaisaTxnId: sabpaisaTxnId || '' },
                errors: 'null'
            });
        }

        const wasAlreadySuccess = existingTxn.status === 'gateway_success';

        // 5. Integrity check: amount mismatch
        const paidAmountPaise = Math.round(parseFloat(amount) * 100);
        const expectedAmountPaise = existingTxn?.expected_amount_paise ? Number(existingTxn.expected_amount_paise) : null;
        let fulfillmentFailed = false;

        if (internalStatus === 'gateway_success' && expectedAmountPaise !== null) {
            if (paidAmountPaise !== expectedAmountPaise) {
                console.error(`[Webhook] INTEGRITY VIOLATION for txn ${clientTxnId}: Expected ${expectedAmountPaise} paise, Received ${paidAmountPaise} paise.`);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = `Security Alert: Amount mismatch (Exp: ${expectedAmountPaise}, Rec: ${paidAmountPaise}). Manual verification required.`;
            }
        }

        // 6. Pre-persist gateway_success before fulfillment (idempotency guard)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        if (internalStatus === 'gateway_success' && !wasAlreadySuccess && !fulfillmentFailed) {
            try {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: result.transMsg || status,
                    bank_txn_id: result.bankTxnId,
                    payment_mode: paymentMode,
                    status_code: result.statusCode || status,
                    webhook_received: true
                });
            } catch (preUpdateErr) {
                console.error(`[Webhook] Failed to pre-persist gateway_success for txn ${clientTxnId}:`, preUpdateErr.message);
            }
        }

        // 7. Run fulfillment (shared with callback)
        if (!fulfillmentFailed && !wasAlreadySuccess) {
            const fulfillResult = await fulfillTransaction(supabaseAdmin, existingTxn, internalStatus, {
                clientTxnId,
                amount,
                paymentMode,
                sabpaisaTxnId,
                transMsg: result.transMsg
            });
            fulfillmentFailed = fulfillResult.fulfillmentFailed;
            internalStatus = fulfillResult.internalStatus;
            result.transMsg = fulfillResult.transMsg;
        }

        // 8. Final status update for non-success outcomes
        if (clientTxnId && internalStatus !== 'gateway_success') {
            try {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: result.transMsg || status,
                    bank_txn_id: result.bankTxnId,
                    payment_mode: paymentMode,
                    status_code: result.statusCode || status,
                    webhook_received: true
                });
            } catch (updateErr) {
                console.error(`[Webhook] Failed to update transaction ${clientTxnId}:`, updateErr.message);
            }
        }

        // 9. Return SabPaisa-expected acknowledgement
        return NextResponse.json({
            status: 200,
            message: 'API_SUCCESSFULL_MESSAGE',
            data: {
                statusCode: '01',
                message: 'Data successfully processed',
                sabpaisaTxnId: sabpaisaTxnId || ''
            },
            errors: 'null'
        });

    } catch (error) {
        console.error('[SabPaisa Webhook] Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
