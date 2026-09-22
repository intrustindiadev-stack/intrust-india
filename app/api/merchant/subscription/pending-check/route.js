/**
 * GET /api/merchant/subscription/pending-check?merchantId=<uuid>&verify=<bool>
 *
 * Checks whether there is an in-flight SabPaisa-initiated subscription
 * transaction for this merchant that hasn't been confirmed yet.
 *
 * Used by MerchantSubscriptionPayButton on mount to surface a warning
 * banner and disable pay buttons, preventing double-payments
 * when a webhook/callback delivery fails.
 *
 * Optional parameter:
 *   verify=true — actively inquires SabPaisa gateway status and fulfills if confirmed success.
 *
 * Returns:
 *   { pending: false }                        — no pending transaction
 *   { pending: true, pendingTxnId, pendingSince, minutesAgo }  — one exists
 *   { pending: false, resolved: true, status: 'success' }     — verified and fulfilled!
 */
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import sabpaisaClient from '@/lib/sabpaisa/client';
import { fulfillTransaction } from '@/lib/sabpaisa/fulfillment';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '@/lib/supabase/queries';

const PENDING_WINDOW_MINUTES = 30;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const shouldVerify = searchParams.get('verify') === 'true';

    if (!merchantId) {
        return NextResponse.json({ error: 'merchantId is required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const pendingCutoff = new Date(Date.now() - PENDING_WINDOW_MINUTES * 60 * 1000).toISOString();

    const { data: pendingTxn, error } = await supabaseAdmin
        .from('transactions')
        .select('id, client_txn_id, created_at')
        .eq('udf1', 'MERCHANT_SUBSCRIPTION')
        .eq('udf2', merchantId)
        .eq('status', 'initiated')
        .gt('created_at', pendingCutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[PendingCheck] DB error:', error.message);
        // Fail open — don't block the UI if the check fails
        return NextResponse.json({ pending: false });
    }

    if (!pendingTxn) {
        return NextResponse.json({ pending: false });
    }

    const minutesAgo = Math.round((Date.now() - new Date(pendingTxn.created_at).getTime()) / 60000);

    // On-demand gateway verification
    if (shouldVerify && pendingTxn.client_txn_id) {
        try {
            console.log(`[PendingCheck] Inquiring SabPaisa for pending txn ${pendingTxn.client_txn_id}...`);
            const gatewayResult = await sabpaisaClient.verifyTransaction(pendingTxn.client_txn_id);
            const internalStatus = gatewayResult?.internalStatus;

            await logTransactionEvent(pendingTxn.client_txn_id, 'RECONCILE_CHECK', {
                gatewayStatus: gatewayResult?.status,
                gatewayStatusCode: gatewayResult?.statusCode,
                sabpaisaTxnId: gatewayResult?.sabpaisaTxnId,
                internalStatus,
                source: 'merchant-subscription-pending-check'
            }, gatewayResult?.message || gatewayResult?.status);

            if (internalStatus === 'gateway_success') {
                const fullTxn = await getTransactionByClientTxnId(pendingTxn.client_txn_id);
                if (fullTxn && !fullTxn.fulfilled_at) {
                    const amount = gatewayResult.paidAmount || gatewayResult.amount;
                    const sabpaisaTxnId = gatewayResult.sabpaisaTxnId;
                    const paymentMode = gatewayResult.paymentMode;

                    await updateTransaction(pendingTxn.client_txn_id, {
                        status: 'gateway_success',
                        sabpaisa_txn_id: sabpaisaTxnId,
                        paid_amount: amount,
                        sabpaisa_message: `Verified on-demand: ${gatewayResult.message || 'Success'}`,
                        payment_mode: paymentMode,
                        status_code: gatewayResult.statusCode || null,
                        webhook_received: false
                    });

                    const fulfillResult = await fulfillTransaction(supabaseAdmin, fullTxn, 'gateway_success', {
                        clientTxnId: pendingTxn.client_txn_id,
                        amount,
                        paymentMode,
                        sabpaisaTxnId,
                        transMsg: 'Verified on-demand via pending check'
                    });

                    if (fulfillResult.fulfillmentComplete && !fulfillResult.fulfillmentFailed) {
                        await updateTransaction(pendingTxn.client_txn_id, { fulfilled_at: new Date().toISOString() });
                        return NextResponse.json({
                            pending: false,
                            resolved: true,
                            status: 'success',
                            message: 'Payment confirmed and subscription activated!'
                        });
                    }
                }
            } else if (internalStatus === 'failed' || internalStatus === 'aborted') {
                await updateTransaction(pendingTxn.client_txn_id, {
                    status: internalStatus,
                    sabpaisa_txn_id: gatewayResult.sabpaisaTxnId || null,
                    sabpaisa_message: `Verified on-demand: ${gatewayResult.message || gatewayResult.status}`,
                    status_code: gatewayResult.statusCode || null
                });
                return NextResponse.json({
                    pending: false,
                    resolved: true,
                    status: internalStatus,
                    message: 'The previous payment attempt was cancelled or failed. You may now try again.'
                });
            }
        } catch (verifyErr) {
            console.error('[PendingCheck] Verify error:', verifyErr);
        }
    }

    return NextResponse.json({
        pending: true,
        pendingTxnId: pendingTxn.client_txn_id,
        pendingSince: pendingTxn.created_at,
        minutesAgo,
        message: 'A payment is already being processed. Please wait a few minutes or verify status.'
    });
}
