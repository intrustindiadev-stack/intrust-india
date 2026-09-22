export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/cron/payment-reconcile
 *
 * Reconciliation job for missed SabPaisa webhooks/callbacks.
 *
 * Problem it solves:
 *   SabPaisa marks a payment as SUCCESS but the webhook POST to our server
 *   fails (network hiccup, timeout, etc.). The transaction stays permanently
 *   stuck in "initiated" and the customer's purchase is never fulfilled.
 *
 * What it does:
 *   1. Finds all transactions stuck in "initiated" for > 20 minutes.
 *   2. For each one, calls SabPaisa's Transaction Enquiry API (verifyTransaction).
 *   3. If SabPaisa confirms SUCCESS → runs the exact same fulfillTransaction()
 *      path used by the webhook/callback (fully idempotent).
 *   4. If SabPaisa confirms FAILED/ABORTED → marks the transaction as failed.
 *   5. Transactions still PENDING at the gateway are left alone (may still resolve).
 *
 * Trigger frequency: Every 30 minutes via system cron:
 *   *\/30 * * * * curl -s -X GET https://intrustindia.com/api/cron/payment-reconcile \
 *     -H "Authorization: Bearer $CRON_SECRET" >> /home/intrustindia/logs/cron.log 2>&1
 *
 * Safety guards:
 *   - CRON_SECRET bearer auth (same as all other cron routes)
 *   - fulfillTransaction() is internally idempotent — safe to re-run
 *   - Amount integrity check before fulfillment (mirrors webhook behaviour)
 *   - Caps at 50 transactions per run to avoid runaway execution
 *   - Skips transactions < 20 minutes old (allow webhook/callback to arrive first)
 *   - Skips transactions > 24 hours old (too stale — log for manual review)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sabpaisaClient from '@/lib/sabpaisa/client';
import { fulfillTransaction } from '@/lib/sabpaisa/fulfillment';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '@/lib/supabase/queries';
import { mapStatusToInternal } from '@/lib/sabpaisa/utils';

const STALE_MINUTES = 20;    // Minimum age — allow webhook to arrive first
const MAX_AGE_HOURS = 24;    // Ignore very old transactions (manual review)
const MAX_PER_RUN = 50;      // Safety cap per cron invocation

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_MINUTES * 60 * 1000);
    const maxAgeThreshold = new Date(now.getTime() - MAX_AGE_HOURS * 60 * 60 * 1000);

    // 1. Find all "initiated" transactions in the reconciliation window
    const { data: stuckTxns, error: fetchErr } = await supabaseAdmin
        .from('transactions')
        .select('id, client_txn_id, user_id, status, udf1, udf2, udf3, paid_amount, expected_amount_paise, fulfilled_at, sabpaisa_txn_id')
        .eq('status', 'initiated')
        .lt('created_at', staleThreshold.toISOString())
        .gt('created_at', maxAgeThreshold.toISOString())
        .is('fulfilled_at', null)
        .limit(MAX_PER_RUN);

    if (fetchErr) {
        console.error('[PaymentReconcile] Failed to fetch stuck transactions:', fetchErr.message);
        return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!stuckTxns || stuckTxns.length === 0) {
        console.log('[PaymentReconcile] No stuck transactions found.');
        return NextResponse.json({ success: true, checked: 0, fulfilled: 0, failed: 0, skipped: 0 });
    }

    console.log(`[PaymentReconcile] Found ${stuckTxns.length} stuck transaction(s) to reconcile.`);

    let fulfilled = 0, failed = 0, skipped = 0;

    for (const txn of stuckTxns) {
        const clientTxnId = txn.client_txn_id;

        if (!clientTxnId) {
            console.warn(`[PaymentReconcile] Txn ${txn.id} has no client_txn_id — skipping.`);
            skipped++;
            continue;
        }

        try {
            // 2. Query SabPaisa for the real status
            console.log(`[PaymentReconcile] Checking SabPaisa for txn ${clientTxnId}...`);
            const gatewayResult = await sabpaisaClient.verifyTransaction(clientTxnId);

            const internalStatus = gatewayResult.internalStatus;
            console.log(`[PaymentReconcile] SabPaisa status for ${clientTxnId}: ${gatewayResult.status} → internal: ${internalStatus}`);

            // Log the reconciliation check
            await logTransactionEvent(clientTxnId, 'RECONCILE_CHECK', {
                gatewayStatus: gatewayResult.status,
                gatewayStatusCode: gatewayResult.statusCode,
                sabpaisaTxnId: gatewayResult.sabpaisaTxnId,
                internalStatus,
                source: 'payment-reconcile-cron'
            }, gatewayResult.message || gatewayResult.status);

            // 3a. Gateway says PENDING — leave it, may still resolve
            if (internalStatus === 'pending') {
                console.log(`[PaymentReconcile] Txn ${clientTxnId} still PENDING at gateway — leaving for next run.`);
                skipped++;
                continue;
            }

            // 3b. Gateway error (network issue talking to SabPaisa) — skip safely
            if (gatewayResult.status === 'ERROR') {
                console.warn(`[PaymentReconcile] Gateway enquiry error for ${clientTxnId}: ${gatewayResult.message} — skipping.`);
                skipped++;
                continue;
            }

            // 3c. Gateway says FAILED or ABORTED — close the transaction
            if (internalStatus === 'failed' || internalStatus === 'aborted') {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: gatewayResult.sabpaisaTxnId || null,
                    sabpaisa_message: `Reconciled: ${gatewayResult.message || gatewayResult.status}`,
                    status_code: gatewayResult.statusCode || null,
                    webhook_received: false
                });
                console.log(`[PaymentReconcile] Txn ${clientTxnId} closed as ${internalStatus}.`);
                failed++;
                continue;
            }

            // 3d. Gateway says SUCCESS — run fulfillment
            if (internalStatus === 'gateway_success') {
                const amount = gatewayResult.paidAmount || gatewayResult.amount;
                const sabpaisaTxnId = gatewayResult.sabpaisaTxnId;
                const paymentMode = gatewayResult.paymentMode;

                // Re-fetch the full transaction (to get all fields fulfillment.js needs)
                const fullTxn = await getTransactionByClientTxnId(clientTxnId);
                if (!fullTxn) {
                    console.error(`[PaymentReconcile] Could not re-fetch txn ${clientTxnId} — skipping.`);
                    skipped++;
                    continue;
                }

                // Idempotency: already fulfilled while we were running?
                if (fullTxn.fulfilled_at) {
                    console.log(`[PaymentReconcile] Txn ${clientTxnId} was fulfilled concurrently — skipping.`);
                    skipped++;
                    continue;
                }

                // Amount integrity check (mirrors webhook)
                const paidAmountPaise = Math.round(parseFloat(amount) * 100);
                const expectedAmountPaise = fullTxn.expected_amount_paise ? Number(fullTxn.expected_amount_paise) : null;
                if (expectedAmountPaise !== null && paidAmountPaise !== expectedAmountPaise) {
                    console.error(`[PaymentReconcile] INTEGRITY VIOLATION for txn ${clientTxnId}: Expected ${expectedAmountPaise} paise, Received ${paidAmountPaise} paise. Blocking fulfillment.`);
                    await updateTransaction(clientTxnId, {
                        status: 'failed',
                        sabpaisa_message: `RECONCILE INTEGRITY BLOCK: Amount mismatch (Expected: ${expectedAmountPaise}, Received: ${paidAmountPaise})`,
                    });
                    failed++;
                    continue;
                }

                // Pre-persist gateway_success before fulfillment (idempotency guard)
                await updateTransaction(clientTxnId, {
                    status: 'gateway_success',
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: `Reconciled SUCCESS: ${gatewayResult.message || 'Webhook missed'}`,
                    payment_mode: paymentMode,
                    status_code: gatewayResult.statusCode || null,
                    webhook_received: false
                });

                // Run the shared fulfillment logic
                const fulfillResult = await fulfillTransaction(supabaseAdmin, fullTxn, 'gateway_success', {
                    clientTxnId,
                    amount,
                    paymentMode,
                    sabpaisaTxnId,
                    transMsg: `Reconciled via cron (missed webhook)`
                });

                if (fulfillResult.fulfillmentComplete && !fulfillResult.fulfillmentFailed) {
                    await updateTransaction(clientTxnId, { fulfilled_at: new Date().toISOString() });
                    console.log(`[PaymentReconcile] ✅ Txn ${clientTxnId} fulfilled successfully.`);
                    fulfilled++;
                } else {
                    console.error(`[PaymentReconcile] ❌ Fulfillment failed for txn ${clientTxnId}: ${fulfillResult.transMsg}`);
                    failed++;
                }
            }
        } catch (err) {
            console.error(`[PaymentReconcile] Unexpected error for txn ${clientTxnId}:`, err.message);
            skipped++;
        }

        // Small delay between gateway API calls to avoid rate-limiting
        await new Promise(r => setTimeout(r, 300));
    }

    const summary = {
        success: true,
        checked: stuckTxns.length,
        fulfilled,
        failed,
        skipped,
        ranAt: now.toISOString()
    };

    console.log('[PaymentReconcile] Run complete:', summary);
    return NextResponse.json(summary);
}
