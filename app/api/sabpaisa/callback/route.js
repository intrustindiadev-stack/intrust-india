// Force Node.js runtime — this route decrypts SabPaisa gateway responses using
// AES-256-GCM + HMAC-SHA384 via node:crypto (lib/sabpaisa/encrypt.js → decrypt).
// The Edge runtime does not expose Node crypto, so we must pin explicitly.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/sabpaisa/encrypt';
import { createClient } from '@supabase/supabase-js';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '@/lib/supabase/queries';
import { mapStatusToInternal } from '@/lib/sabpaisa/utils';
import { fulfillTransaction } from '@/lib/sabpaisa/fulfillment';
import crypto from 'crypto';

const ALLOWED_IPS = (process.env.SABPAISA_ALLOWED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean);

export async function GET() {
    console.warn('[SabPaisa] Suspicious GET request to callback URL');
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export async function POST(request) {
    // 1. IP Whitelisting (Optional but highly recommended)
    if (ALLOWED_IPS.length > 0) {
        let clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
            request.headers.get('x-real-ip') ||
            'unknown';

        if (!ALLOWED_IPS.includes(clientIp)) {
            console.error(`[SabPaisa] Blocked unauthorized callback from IP: ${clientIp}`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    try {
        const buildRedirectUrl = (path) => {
            // Respect ngrok/proxy headers if available
            const protocol = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
            const host = request.headers.get('x-forwarded-host') || request.headers.get('host');

            try {
                const base = `${protocol}://${host}`;
                return new URL(path, base);
            } catch (e) {
                // Fallback to relative if headers fail
                return new URL(path, request.url);
            }
        };

        // SabPaisa sends the response back via a POST form submission
        const formData = await request.formData();
        const encResponse = formData.get('encResponse');

        if (!encResponse) {
            console.error('[SabPaisa Callback] No encrypted response received');
            return NextResponse.redirect(buildRedirectUrl('/payment/failure?reason=missing_payload'), 303);
        }

        // Decrypt the response using our internal Sabpaisa Kit 2.0 GCM decryption
        // to guarantee server-side compatibility (SDK uses HEX encoding)
        const decryptedString = decrypt(encResponse);

        if (!decryptedString) {
            console.error('[SabPaisa Callback] Failed to decrypt response. Raw received length:', encResponse?.length);
            return NextResponse.redirect(buildRedirectUrl('/payment/failure?reason=decryption_failed'), 303);
        }

        // The decrypted string is URL-encoded query parameters
        const params = new URLSearchParams(decryptedString);
        const result = Object.fromEntries(params.entries());

        // LOGGING: Sanitize output to remove PII (email, mobile, address, etc.)
        const sanitizedResult = { ...result };
        ['payerEmail', 'payerMobile', 'payerAddress', 'payerName', 'transUserPassword'].forEach(key => {
            if (sanitizedResult[key]) sanitizedResult[key] = '***';
        });

        console.log('SabPaisa Callback Decrypted Data (Sanitized):', sanitizedResult);

        const clientTxnId = result.clientTxnId;
        const status = result.status || result.statusCode; // SUCCESS, FAILED, ABORTED, etc.
        const sabpaisaTxnId = result.sabpaisaTxnId || result.transId;
        const amount = result.amount;

        // Map status to internal enum
        let internalStatus = mapStatusToInternal(result.statusCode || status);
        console.log(`[Callback] txn=${clientTxnId} status=${internalStatus} amount=${amount}`);

        // 2. Log Callback
        if (clientTxnId) {
            await logTransactionEvent(clientTxnId, 'CALLBACK', {
                statusCode: result.statusCode,
                status: result.status,
                paymentMode: result.paymentMode,
                bankTxnId: result.bankTxnId,
                sabpaisaTxnId: sabpaisaTxnId
            }, result.transMsg || status);
        }

        // 3. Get Existing Transaction to Check Type
        const existingTxn = await getTransactionByClientTxnId(clientTxnId);

        // ── Idempotency: gate on fulfilled_at, NOT on raw gateway_success ──────
        // wasAlreadySuccess alone is no longer sufficient: a prior callback may have
        // written gateway_success and then crashed before fulfillTransaction() finished.
        // wasAlreadyFulfilled = true means all fulfillment side-effects completed
        // durably; only then do we skip fulfillment on retries.
        const wasAlreadySuccess = existingTxn && existingTxn.status === 'gateway_success';
        const wasAlreadyFulfilled = existingTxn?.fulfilled_at != null;

        // Critical guard: if no DB record exists, log it prominently.
        // This happens when: (a) initiate failed before INSERT, (b) service key misconfigured,
        // or (c) Sabpaisa sent a callback for a transaction we never initiated.
        if (!existingTxn) {
            console.error(
                `[Callback] CRITICAL — No transaction record found for clientTxnId="${clientTxnId}" ` +
                `internalStatus=${internalStatus} amount=${amount}. ` +
                `Fulfillment blocks will be skipped. Redirecting based on decrypted status.`
            );
        }

        // ── Declare fulfillmentFailed before any branch that may set it ──
        let fulfillmentFailed = false;

        // ── Integrity Validation: Amount Mismatch Check ──
        const paidAmountPaise = Math.round(parseFloat(amount) * 100);
        const expectedAmountPaise = existingTxn?.expected_amount_paise ? Number(existingTxn.expected_amount_paise) : null;

        if (existingTxn && internalStatus === 'gateway_success' && expectedAmountPaise !== null) {
            // Allow 0 paise tolerance - must be exact match for fixed-price flows
            if (paidAmountPaise !== expectedAmountPaise) {
                console.error(
                    `[Callback] INTEGRITY VIOLATION for txn ${clientTxnId}: Amount Mismatch. ` +
                    `Expected: ${expectedAmountPaise} paise, Received: ${paidAmountPaise} paise. ` +
                    `Fulfillment BLOCKED to prevent loss/tampering.`
                );
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = `Security Alert: Amount mismatch (Exp: ${expectedAmountPaise}, Rec: ${paidAmountPaise}). Manual verification required. Contact support.`;
            }
        }

        // ── Idempotency: Persist gateway_success BEFORE fulfillment ──────────
        // Writing the status to the DB now means any concurrent or retried
        // callback will find wasAlreadySuccess=true (useful for the status field),
        // but fulfillment is only skipped when fulfilled_at is also set.
        if (existingTxn && internalStatus === 'gateway_success' && !wasAlreadySuccess && !fulfillmentFailed) {
            try {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: result.transMsg || status,
                    bank_txn_id: result.bankTxnId,
                    payment_mode: result.paymentMode,
                    status_code: result.statusCode || status
                });
                console.log(`[Callback] Pre-fulfillment status persisted as gateway_success for txn ${clientTxnId}`);
            } catch (preUpdateErr) {
                console.error(`[Callback] Failed to pre-persist gateway_success for txn ${clientTxnId}:`, preUpdateErr.message);
                // Non-fatal: fulfillment will still proceed; the final update at end will retry.
            }
        }

        // ── Success fulfillment — delegated to shared fulfillTransaction() ───
        // Guard: skip only when fulfilled_at is already set (all side-effects durably complete).
        // If gateway_success is set but fulfilled_at is NULL, a prior attempt crashed mid-way
        // and we MUST retry. Each branch inside fulfillment.js enforces its own idempotency
        // (WALLET_TOPUP: checks customer_wallet_transactions; GOLD_SUBSCRIPTION/MERCHANT_SUBSCRIPTION:
        // check gateway_txn_id/last_sub_gateway_txn_id on the record; MERCHANT_LOCKIN/AIGROW:
        // check gateway_txn_id on the created row) so re-running fulfillment is safe.
        if (!fulfillmentFailed && !wasAlreadyFulfilled) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const fulfillResult = await fulfillTransaction(supabaseAdmin, existingTxn, internalStatus, {
                clientTxnId,
                amount,
                paymentMode: result.paymentMode,
                sabpaisaTxnId,
                transMsg: result.transMsg
            });

            fulfillmentFailed = fulfillResult.fulfillmentFailed;
            internalStatus = fulfillResult.internalStatus;
            result.transMsg = fulfillResult.transMsg;

            // ── Stamp fulfilled_at on durable completion ──────────────────
            // Only written when fulfillTransaction() reports no failure.
            // A future retry will see fulfilled_at IS NOT NULL and skip.
            if (fulfillResult.fulfillmentComplete && clientTxnId) {
                try {
                    await updateTransaction(clientTxnId, { fulfilled_at: new Date().toISOString() });
                    console.log(`[Callback] fulfilled_at stamped for txn ${clientTxnId}`);
                } catch (stampErr) {
                    // Non-fatal — the next retry will re-run fulfillment (idempotent inside fulfillment.js).
                    console.error(`[Callback] Failed to stamp fulfilled_at for txn ${clientTxnId}:`, stampErr.message);
                }
            }
        } else if (wasAlreadyFulfilled) {
            console.log(`[Callback] txn ${clientTxnId} already fulfilled (fulfilled_at set). Skipping fulfillment.`);
        }

        // ── Failure / Abort-path: type-specific DB cleanup ───────────────────
        // These blocks are callback-specific and intentionally NOT part of
        // fulfillTransaction() — the webhook never needs to undo pending records
        // because it only fires for confirmed outcomes, whereas the browser
        // redirect flow can arrive with FAILED/ABORTED after a live user session.

        // 5e. CART_CHECKOUT — mark shopping_order_group as failed/aborted
        if (existingTxn && internalStatus !== 'gateway_success' && existingTxn.udf1 === 'CART_CHECKOUT') {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                const groupId = existingTxn.udf2;
                // Guard: never overwrite an already-paid/completed row with failure.
                // finalize_gateway_orders sets payment_status='paid', so checking that is sufficient.
                await supabaseAdmin
                    .from('shopping_order_groups')
                    .update({ status: 'failed', payment_status: 'failed' })
                    .eq('id', groupId)
                    .neq('payment_status', 'paid');
                console.log(`[Callback] Cart checkout marked as failed/aborted for txn ${clientTxnId}`);

                // Notify Customer of Payment Failure
                await supabaseAdmin.from('notifications').insert([{
                    user_id: existingTxn.user_id,
                    title: 'Checkout Payment Failed ❌',
                    body: `Your payment of ₹${amount} for order checkout failed. Please try again or use another method.`,
                    type: 'error',
                    reference_type: 'shopping_order',
                    reference_id: groupId
                }]);
            } catch (failError) {
                console.error('[Callback] Failed to flag cart checkout as failed:', failError.message);
            }
        }

        // 5f-nfc-fail. NFC_ORDER — mark nfc_order payment as failed
        if (existingTxn && internalStatus !== 'gateway_success' && existingTxn.udf1 === 'NFC_ORDER') {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                const nfcOrderId = existingTxn.udf2;
                // Guard: never overwrite an already-paid order with failure
                await supabaseAdmin
                    .from('nfc_orders')
                    .update({ payment_status: 'failed' })
                    .eq('id', nfcOrderId)
                    .neq('payment_status', 'paid');
                console.log(`[Callback] NFC order ${nfcOrderId} marked as payment_failed for txn ${clientTxnId}`);
            } catch (failErr) {
                console.error('[Callback] Failed to mark NFC order as failed:', failErr.message);
            }
        }

        // 5g-gold-fail. GOLD_SUBSCRIPTION — no persistent record to mark, but log for ops visibility.
        // (Gold activation only updates user_profiles; if it failed during fulfillment, the profile
        // was not mutated, so no rollback is needed here.)
        if (existingTxn && internalStatus !== 'gateway_success' && existingTxn.udf1 === 'GOLD_SUBSCRIPTION') {
            console.log(`[Callback] GOLD_SUBSCRIPTION payment did not succeed for txn ${clientTxnId} — no pending record to clean up.`);
        }

        // 5h-wholesale-fail. WHOLESALE_PURCHASE — mark draft as failed in wholesale_order_drafts.
        // Table: wholesale_order_drafts (status column: 'pending' | 'completed' | 'failed').
        // failure_reason column added by 20260517_wholesale_draft_failure_reason.sql.
        // Guard: never overwrite an already-completed draft with failure.
        if (existingTxn && internalStatus !== 'gateway_success' && existingTxn.udf1 === 'WHOLESALE_PURCHASE') {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                const draftId = existingTxn.udf2;
                if (draftId) {
                    await supabaseAdmin
                        .from('wholesale_order_drafts')
                        .update({
                            status: 'failed',
                            failure_reason: result.transMsg || 'Payment failed or aborted'
                        })
                        .eq('id', draftId)
                        .neq('status', 'completed');
                    console.log(`[Callback] Wholesale draft ${draftId} marked as failed for txn ${clientTxnId}`);
                }
            } catch (failErr) {
                console.error('[Callback] Failed to mark wholesale draft as failed:', failErr.message);
            }
        }

        // 5i-msub-fail. MERCHANT_SUBSCRIPTION — no additional record needed; subscription_status
        // remains at its prior state if fulfillment didn't run, so no cleanup required.
        // Log for ops visibility.
        if (existingTxn && internalStatus !== 'gateway_success' && existingTxn.udf1 === 'MERCHANT_SUBSCRIPTION') {
            console.log(`[Callback] MERCHANT_SUBSCRIPTION payment did not succeed for txn ${clientTxnId} — subscription_status unchanged.`);
        }

        // 5j-lockin-fail. MERCHANT_LOCKIN — no lockin_balance row is created until fulfillment succeeds,
        // so there is nothing to roll back on failure. Log for ops visibility.
        if (existingTxn && internalStatus !== 'gateway_success' && existingTxn.udf1 === 'MERCHANT_LOCKIN') {
            console.log(`[Callback] MERCHANT_LOCKIN payment did not succeed for txn ${clientTxnId} — no lockin record to clean up.`);
        }

        // 5k-aigrow-fail. MERCHANT_AIGROW — no investment row is created until fulfillment succeeds,
        // so there is nothing to roll back on failure. Log for ops visibility.
        if (existingTxn && internalStatus !== 'gateway_success' && existingTxn.udf1 === 'MERCHANT_AIGROW') {
            console.log(`[Callback] MERCHANT_AIGROW payment did not succeed for txn ${clientTxnId} — no investment record to clean up.`);
        }

        // 7b. Catch-all: Downgrade to failure if fulfillment failed on any path but status wasn't reset
        if (fulfillmentFailed && internalStatus === 'gateway_success') {
            internalStatus = 'failed';
            if (!result.transMsg || result.transMsg === status) {
                result.transMsg = 'Fulfillment error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 4. Update Transaction Status (for non-success paths or if pre-update was skipped)
        // gateway_success was already persisted before fulfillment above; only re-write
        // for failure/pending/aborted outcomes or when pre-update was not applicable.
        if (clientTxnId && internalStatus !== 'gateway_success') {
            try {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: result.transMsg || status,
                    bank_txn_id: result.bankTxnId,
                    payment_mode: result.paymentMode,
                    status_code: result.statusCode || status
                });
            } catch (updateErr) {
                console.error(`[Callback] Failed to update transaction for clientTxnId="${clientTxnId}":`, updateErr.message, updateErr.code || '');
            }
        }

        // 8. Redirect User based on Status and Transaction Type
        let redirectPath = '/payment/failure';
        let redirectQuery = `?txnId=${clientTxnId}&msg=${encodeURIComponent(result.transMsg || 'Payment Failed')}`;

        if (internalStatus === 'gateway_success') {
            redirectPath = '/payment/success';
            redirectQuery = '?txnId=' + clientTxnId;
        } else if (internalStatus === 'pending') {
            redirectPath = '/payment/processing';
            redirectQuery = `?txnId=${clientTxnId}`;
        } else if (internalStatus === 'failed' || internalStatus === 'aborted') {
            // Handle failed/aborted payments with appropriate messaging
            redirectPath = '/payment/failure';
            redirectQuery = `?txnId=${clientTxnId}&msg=${encodeURIComponent(result.transMsg || 'Payment Failed')}`;
        } else {
            // Timeout or unknown status - redirect to processing page
            redirectPath = '/payment/processing';
            redirectQuery = `?txnId=${clientTxnId}&status=timeout`;
        }

        const destination = redirectPath + redirectQuery;

        // ── 9. Generate and Store Recovery Token for iOS ITP ──
        let recoveryTokenCookie = null;
        if (clientTxnId) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                
                const recoveryToken = crypto.randomBytes(32).toString('hex');
                const hashedToken = crypto.createHash('sha256').update(recoveryToken).digest('hex');
                
                // Use a strict 60-second expiry from NOW
                const { error: tokenErr } = await supabaseAdmin
                    .from('payment_session_recovery')
                    .update({
                        recovery_token_hash: hashedToken,
                        token_expires_at: new Date(Date.now() + 60000).toISOString()
                    })
                    .eq('txn_id', clientTxnId);
                
                if (!tokenErr) {
                    recoveryTokenCookie = recoveryToken;
                    console.log(`[Callback] Generated 60s recovery token for txn ${clientTxnId}`);
                } else {
                    console.error(`[Callback] Failed to store recovery token for txn ${clientTxnId}:`, tokenErr);
                }
            } catch (err) {
                console.error(`[Callback] Error generating recovery token:`, err);
            }
        }

        const response = NextResponse.redirect(buildRedirectUrl(`/payment/bounce?to=${encodeURIComponent(destination)}&txnId=${clientTxnId}`), 303);
        
        if (recoveryTokenCookie) {
            response.cookies.set('payment_recovery_token', recoveryTokenCookie, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60, // 60 seconds
                path: '/api/sabpaisa/exchange-token'
            });
        }
        
        return response;

    } catch (error) {
        console.error('API Callback Error:', error);

        // Final fallback redirect in case of fatal error
        try {
            const fallbackUrl = new URL('/payment/failure?reason=internal_error', request.url);
            if (fallbackUrl.hostname === 'localhost' || fallbackUrl.hostname === '127.0.0.1') fallbackUrl.protocol = 'http:';
            return NextResponse.redirect(fallbackUrl, 303);
        } catch (_) {
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
}
