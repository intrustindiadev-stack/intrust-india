// Force Node.js runtime — this route decrypts SabPaisa gateway responses using
// AES-256-GCM + HMAC-SHA384 via node:crypto (lib/sabpaisa/encrypt.js → decrypt).
// The Edge runtime does not expose Node crypto, so we must pin explicitly.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/sabpaisa/encrypt';
import { createClient } from '@supabase/supabase-js';
import { 
    notifyMerchantSubscriptionStatus,
    notifyMerchantGiftCardSold,
    notifyMerchantStoreCreditPaid
} from '@/lib/notifications/merchantWhatsapp';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '@/lib/supabase/queries';
import { CustomerWalletService } from '@/lib/wallet/customerWalletService';
import { mapStatusToInternal } from '@/lib/sabpaisa/utils';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';
import { MERCHANT_SUBSCRIPTION_PLANS } from '@/lib/constants';
import { logRewardRpcResult } from '@/lib/rewardRpcResult';

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
        const wasAlreadySuccess = existingTxn && existingTxn.status === 'gateway_success';

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
        // callback will find wasAlreadySuccess=true and skip all fulfillment
        // blocks, preventing double-crediting of rewards/wallets.
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

        // 5. Handle Wallet Credit for WALLET_TOPUP safely
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'WALLET_TOPUP' && !wasAlreadySuccess) {
            try {
                await CustomerWalletService.creditWallet(
                    existingTxn.user_id,
                    amount,
                    'TOPUP',
                    `Wallet Topup via Sabpaisa (${result.paymentMode || 'Gateway'})`,
                    { id: clientTxnId, type: 'TOPUP' }
                );
                console.log(`[Callback] Wallet credited for txn ${clientTxnId}`);

                // 5.1 ADDED: Notify Customer
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                await supabaseAdmin.from('notifications').insert([{
                    user_id: existingTxn.user_id,
                    title: 'Wallet Topped Up ✅',
                    body: `Your wallet has been credited with ₹${amount}.`,
                    type: 'success',
                    reference_type: 'wallet_topup',
                    reference_id: clientTxnId
                }]);

                // 5.2 Distribute wallet_topup reward (non-blocking — must not fail the credit)
                try {
                    const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                        p_event_type: 'wallet_topup',
                        p_source_user_id: existingTxn.user_id,
                        p_reference_id: existingTxn.id,
                        p_reference_type: 'wallet_topup',
                        p_amount_paise: Math.round(parseFloat(amount) * 100)
                    });
                    if (rewardError) {
                        console.error('[Callback] Wallet topup reward RPC error:', rewardError);
                    } else {
                        logRewardRpcResult({
                            event_type: 'wallet_topup',
                            source_user_id: existingTxn.user_id,
                            reference_id: existingTxn.id,
                            reference_type: 'wallet_topup',
                        }, rewardData);
                    }
                } catch (rewardErr) {
                    console.error('[Callback] Wallet topup reward distribution error:', rewardErr.message);
                }
            } catch (walletError) {
                console.error('[Callback] Failed to credit wallet:', walletError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Wallet credit failed. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 5b. Handle Merchant Wallet Credit for MERCHANT_TOPUP safely
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'MERCHANT_TOPUP' && !wasAlreadySuccess) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                // Check for idempotency
                const { data: existingCredit } = await supabaseAdmin
                    .from('merchant_transactions')
                    .select('id')
                    .eq('metadata->>id', clientTxnId)
                    .eq('metadata->>type', 'MERCHANT_TOPUP')
                    .maybeSingle();

                if (existingCredit) {
                    console.log(`[Callback] Merchant Wallet credit already applied for txn ${clientTxnId}`);
                } else {
                    // Get merchant ID for user
                    const { data: merchant, error: merchantErr } = await supabaseAdmin
                        .from('merchants')
                        .select('id, wallet_balance_paise')
                        .eq('user_id', existingTxn.user_id)
                        .single();

                    if (merchantErr) throw merchantErr;

                    if (merchant) {
                        const amountPaise = Math.round(parseFloat(amount) * 100);
                        const newBalance = merchant.wallet_balance_paise + amountPaise;

                        // Update balance
                        const { error: balanceUpdateErr } = await supabaseAdmin
                            .from('merchants')
                            .update({
                                wallet_balance_paise: newBalance,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', merchant.id);

                        if (balanceUpdateErr) throw balanceUpdateErr;

                        // Insert transaction
                        const { error: txInsertErr } = await supabaseAdmin
                            .from('merchant_transactions')
                            .insert({
                                merchant_id: merchant.id,
                                transaction_type: 'wallet_topup',
                                amount_paise: amountPaise,
                                commission_paise: 0,
                                balance_after_paise: newBalance,
                                description: `Wallet Topup via Sabpaisa (${result.paymentMode || 'Gateway'})`,
                                metadata: { id: clientTxnId, type: 'MERCHANT_TOPUP' }
                            });

                        if (txInsertErr) {
                            console.error('[Callback] History insert failed, rolling back merchant balance:', txInsertErr.message);
                            // Rollback
                            await supabaseAdmin
                                .from('merchants')
                                .update({
                                    wallet_balance_paise: merchant.wallet_balance_paise,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', merchant.id);
                            throw txInsertErr;
                        }

                        console.log(`[Callback] Merchant Wallet credited for txn ${clientTxnId}`);

                        // 5b.1 ADDED: Notify Merchant
                        await supabaseAdmin.from('notifications').insert([{
                            user_id: existingTxn.user_id,
                            title: 'Wallet Funded ✅',
                            body: `Your merchant wallet has been credited with ₹${amount}.`,
                            type: 'success',
                            reference_type: 'merchant_wallet_topup',
                            reference_id: clientTxnId
                        }]);
                    } else {
                        console.error('[Callback] Merchant not found for topup:', existingTxn.user_id);
                        fulfillmentFailed = true;
                        internalStatus = 'failed';
                        result.transMsg = 'Merchant account not found. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
                    }
                }
            } catch (walletError) {
                console.error('[Callback] Failed to credit merchant wallet:', walletError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Merchant wallet credit error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 5c. Handle Udhari Payment Settlement via SabPaisa (gateway-funded)
        // NOTE: Uses settle_udhari_gateway_payment — NOT settle_udhari_payment.
        // The gateway already collected funds, so we must NOT debit the customer wallet.
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'UDHARI_PAYMENT' && !wasAlreadySuccess) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                const udhariRequestId = existingTxn.udf2;
                const merchantId = existingTxn.udf3;

                // Idempotency check — has this udhari already been settled?
                const { data: existingSettlement } = await supabaseAdmin
                    .from('udhari_requests')
                    .select('id, status')
                    .eq('id', udhariRequestId)
                    .eq('status', 'completed')
                    .maybeSingle();

                if (existingSettlement) {
                    console.log(`[Callback] Udhari already settled for txn ${clientTxnId}`);
                } else {
                    // Convert gateway amount to paise
                    const amountPaise = Math.round(parseFloat(amount) * 100);

                    // Call the gateway-specific settlement RPC:
                    //   - marks coupon sold
                    //   - creates order
                    //   - credits merchant wallet
                    //   - writes merchant ledger
                    //   - marks udhari completed
                    //   - does NOT touch customer_wallets
                    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
                        'settle_udhari_gateway_payment',
                        {
                            p_udhari_request_id: udhariRequestId,
                            p_customer_user_id: existingTxn.user_id,
                            p_amount_paise: amountPaise,
                            p_customer_email: existingTxn.payer_email || null
                        }
                    );

                    if (rpcError) {
                        console.error('[Callback] Udhari gateway settlement RPC error:', rpcError.message);
                        fulfillmentFailed = true;
                        internalStatus = 'failed';
                        result.transMsg = 'Udhari settlement failed. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
                    } else {
                        console.log(`[Callback] Udhari settled (gateway) for txn ${clientTxnId}`, rpcResult);

                        // Notify merchant of payment receipt
                        const { data: merchant } = await supabaseAdmin
                            .from('merchants')
                            .select('user_id')
                            .eq('id', merchantId)
                            .single();

                        if (merchant) {
                            await supabaseAdmin.from('notifications').insert({
                                user_id: merchant.user_id,
                                title: 'Store Credit Payment Received ✅',
                                body: `A store credit payment of ₹${amount} has been received via UPI/Card.`,
                                type: 'success',
                                reference_id: udhariRequestId,
                                reference_type: 'udhari_completed'
                            });

                            // 5c.1 WhatsApp Notification (Non-blocking)
                            notifyMerchantStoreCreditPaid({
                                merchantUserId: merchant.user_id,
                                amountRs: amount,
                                item: udhariRequestId.slice(0, 8).toUpperCase()
                            }).catch(e => console.error('[Callback] Udhari WhatsApp notification failed:', e));
                        }
                    }
                }
            } catch (udhariError) {
                console.error('[Callback] Udhari payment processing error:', udhariError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Udhari processing error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }



        // 5d. Handle Cart Checkout
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'CART_CHECKOUT' && !wasAlreadySuccess) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                const groupId = existingTxn.udf2;
                const amountPaise = Math.round(parseFloat(amount) * 100);

                const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
                    'finalize_gateway_orders',
                    {
                        p_group_id: groupId,
                        p_customer_id: existingTxn.user_id,
                        p_amount_paise: amountPaise
                    }
                );

                if (rpcError || (rpcResult && !rpcResult.success)) {
                    const detailedError = rpcError?.message || rpcResult?.message || 'Unknown fulfillment error';
                    console.error('[Callback] Cart checkout finalize error:', detailedError);
                    fulfillmentFailed = true;
                    internalStatus = 'failed';
                    result.transMsg = `Cart order fulfillment failed: ${detailedError}. Payment cannot be fulfilled automatically. Manual verification required. Contact support.`;
                } else {
                    console.log(`[Callback] Cart checkout fulfilled for txn ${clientTxnId}`);

                    // Distribute purchase rewards
                    try {
                        const amountPaise = Math.round(parseFloat(amount) * 100);
                        const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                            p_event_type: 'purchase',
                            p_source_user_id: existingTxn.user_id,
                            p_reference_id: groupId,
                            p_reference_type: 'shopping_order',
                            p_amount_paise: amountPaise
                        });
                        if (rewardError) {
                            console.error('[Callback] Cart checkout reward RPC error:', rewardError);
                        } else {
                            logRewardRpcResult({
                                event_type: 'purchase',
                                source_user_id: existingTxn.user_id,
                                reference_id: groupId,
                                reference_type: 'shopping_order',
                            }, rewardData);
                        }
                    } catch (rewardErr) {
                        console.error('[Callback] Cart checkout reward distribution error:', rewardErr.message);
                    }

                    try {
                        await supabaseAdmin.from('notifications').insert({
                            user_id: existingTxn.user_id,
                            title: 'Order Placed Successfully ✅',
                            body: `Your order of ₹${amount} has been confirmed. Track it in your orders.`,
                            type: 'success',
                            reference_id: groupId,
                            reference_type: 'shopping_order'
                        });

                        // Notify all admins of the new order
                        const { data: adminProfiles } = await supabaseAdmin
                            .from('user_profiles')
                            .select('id')
                            .eq('role', 'admin');

                        if (adminProfiles && adminProfiles.length > 0) {
                            const adminNotifs = adminProfiles.map((ap) => ({
                                user_id: ap.id,
                                title: 'New Platform Order 🛍️',
                                body: `A new shopping order of ₹${amount} has been placed (ID: ${groupId.slice(0, 8).toUpperCase()}).`,
                                type: 'info',
                                reference_id: groupId,
                                reference_type: 'shopping_order'
                            }));

                            await supabaseAdmin.from('notifications').insert(adminNotifs);
                        }

                    } catch (notificationError) {
                        console.error('[Callback] Failed to insert notifications:', notificationError.message);
                    }
                }
            } catch (cartError) {
                console.error('[Callback] Cart checkout processing error:', cartError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Cart checkout processing error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 5e. Handle Cart Checkout Failure
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

                // 5e.1 ADDED: Notify Customer of Payment Failure
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

        // 5f-nfc. Handle NFC Order Payment — Success path
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'NFC_ORDER' && !wasAlreadySuccess) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                const nfcOrderId = existingTxn.udf2;

                // Idempotency: check current payment_status before mutating
                const { data: nfcOrder } = await supabaseAdmin
                    .from('nfc_orders')
                    .select('id, payment_status')
                    .eq('id', nfcOrderId)
                    .single();

                if (nfcOrder?.payment_status === 'paid') {
                    console.log(`[Callback] NFC order ${nfcOrderId} already paid — skipping duplicate fulfillment.`);
                } else {
                    const { error: nfcUpdateErr } = await supabaseAdmin
                        .from('nfc_orders')
                        .update({ payment_status: 'paid', status: 'confirmed' })
                        .eq('id', nfcOrderId)
                        .neq('payment_status', 'paid'); // idempotency guard

                    if (nfcUpdateErr) {
                        console.error('[Callback] NFC order update failed:', nfcUpdateErr.message);
                        fulfillmentFailed = true;
                        internalStatus = 'failed';
                        result.transMsg = 'NFC order fulfillment failed. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
                    } else {
                        console.log(`[Callback] NFC order ${nfcOrderId} marked paid/confirmed for txn ${clientTxnId}`);
                        try {
                            await supabaseAdmin.from('notifications').insert({
                                user_id: existingTxn.user_id,
                                title: 'NFC Card Order Confirmed ✅',
                                body: `Your NFC card order of ₹${amount} has been confirmed and will be dispatched soon.`,
                                type: 'success',
                                reference_id: nfcOrderId,
                                reference_type: 'nfc_order'
                            });
                        } catch (notifErr) {
                            console.error('[Callback] NFC order notification failed:', notifErr.message);
                        }
                    }
                }
            } catch (nfcError) {
                console.error('[Callback] NFC order processing error:', nfcError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'NFC order processing error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 5f-nfc-fail. Handle NFC Order Payment — Failure / Abort path
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

        // 6. Handle Gift Card Purchase — Atomic coupon+order with rollback safety
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'GIFT_CARD' && !wasAlreadySuccess) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                // Add KYC Check Defensive Verification
                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('kyc_status')
                    .eq('id', existingTxn.user_id)
                    .single();

                if (!profile || profile.kyc_status !== 'verified') {
                    console.error(`[Callback] KYC check failed for GIFT_CARD transaction ${clientTxnId}`);
                    // Ensure the transaction is marked as failed or policy-blocked
                    internalStatus = 'failed';
                    result.transMsg = 'KYC Policy Block: Verification required for gift cards';
                    fulfillmentFailed = true;
                } else {
                    const couponId = existingTxn.udf2;
                    if (couponId) {
                        // Step A: Mark coupon as sold (only if still available)
                        const { data: updatedCoupon, error: updateCouponError } = await supabaseAdmin
                            .from('coupons')
                            .update({
                                status: 'sold',
                                purchased_by: existingTxn.user_id,
                                purchased_at: new Date().toISOString()
                            })
                            .eq('id', couponId)
                            .eq('status', 'available')
                            .select('id, merchant_id')
                            .single();

                        if (!updateCouponError && updatedCoupon) {
                            // Step B: Create order record
                            const amountPaise = Math.round(parseFloat(amount) * 100);
                            const { data: newOrder, error: orderError } = await supabaseAdmin
                                .from('orders')
                                .insert({
                                    user_id: existingTxn.user_id,
                                    merchant_id: updatedCoupon.merchant_id,
                                    giftcard_id: couponId,
                                    amount: amountPaise,
                                    payment_status: 'paid',
                                    created_at: new Date().toISOString()
                                })
                                .select('id')
                                .single();

                            if (orderError) {
                                console.error('[Callback] Order insert failed, rolling back coupon:', orderError.message);
                                await supabaseAdmin
                                    .from('coupons')
                                    .update({ status: 'available', purchased_by: null, purchased_at: null })
                                    .eq('id', couponId)
                                    .eq('purchased_by', existingTxn.user_id);
                                fulfillmentFailed = true;
                                internalStatus = 'failed';
                                result.transMsg = 'Order creation failed. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
                            } else {
                                try {
                                    // Customer Notification
                                    await supabaseAdmin.from('notifications').insert({
                                        user_id: existingTxn.user_id,
                                        title: 'Gift Card Purchased ✅',
                                        body: `You successfully purchased a gift card worth ₹${amount}.`,
                                        type: 'success',
                                        reference_id: newOrder.id,
                                        reference_type: 'gift_card_purchase'
                                    });

                                    // Merchant Notification
                                    const { data: merchantDetails } = await supabaseAdmin
                                        .from('merchants')
                                        .select('user_id')
                                        .eq('id', updatedCoupon.merchant_id)
                                        .single();

                                    if (merchantDetails?.user_id) {
                                        await supabaseAdmin.from('notifications').insert({
                                            user_id: merchantDetails.user_id,
                                            title: 'Gift Card Sold 💳',
                                            body: `A customer purchased a gift card worth ₹${amount}.`,
                                            type: 'success',
                                            reference_id: newOrder.id,
                                            reference_type: 'gift_card_purchase'
                                        });

                                        // 6.1 WhatsApp Notification (Non-blocking)
                                        notifyMerchantGiftCardSold({
                                            merchantUserId: merchantDetails.user_id,
                                            amountRs: amount,
                                            brand: 'Store Gift Card'
                                        }).catch(e => console.error('[Callback] Gift card WhatsApp notification failed:', e));
                                    }

                                    // Distribute purchase rewards for gift card
                                    try {
                                        const amountPaise = Math.round(parseFloat(amount) * 100);
                                        const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                                            p_event_type: 'purchase',
                                            p_source_user_id: existingTxn.user_id,
                                            p_reference_id: couponId,
                                            p_reference_type: 'gift_card_purchase',
                                            p_amount_paise: amountPaise
                                        });
                                        if (rewardError) {
                                            console.error('[Callback] Gift card reward RPC error:', rewardError);
                                        } else {
                                            logRewardRpcResult({
                                                event_type: 'purchase',
                                                source_user_id: existingTxn.user_id,
                                                reference_id: couponId,
                                                reference_type: 'gift_card_purchase',
                                            }, rewardData);
                                        }
                                    } catch (rewardErr) {
                                        console.error('[Callback] Gift card reward distribution error:', rewardErr.message);
                                    }
                                } catch (notificationError) {
                                    console.error('[Callback] Gift card notifications failed:', notificationError.message);
                                }
                            }
                        } else {
                            console.error('[Callback] Coupon mark-as-sold failed or already sold');
                            fulfillmentFailed = true;
                            internalStatus = 'failed';
                            result.transMsg = 'Gift card is no longer available. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
                        }
                    } else {
                        console.error('[Callback] Missing couponId in udf2');
                        fulfillmentFailed = true;
                        internalStatus = 'failed';
                        result.transMsg = 'Invalid gift card selection. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
                    }
                }
            } catch (gcError) {
                console.error('[Callback] Gift card processing error:', gcError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Gift card processing error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 7. Handle Gold Subscription Activation
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'GOLD_SUBSCRIPTION' && !wasAlreadySuccess) {
            try {
                const packageId = existingTxn.udf2;
                const monthsToAdd = packageId === 'GOLD_1M' ? 1 : packageId === 'GOLD_3M' ? 3 : 12;

                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('is_gold_verified, subscription_expiry')
                    .eq('id', existingTxn.user_id)
                    .single();

                let baseDate = new Date();
                if (profile?.is_gold_verified && profile?.subscription_expiry) {
                    const currentExpiry = new Date(profile.subscription_expiry);
                    if (currentExpiry > baseDate) baseDate = currentExpiry;
                }

                const newExpiryDate = new Date(baseDate);
                newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

                await supabaseAdmin
                    .from('user_profiles')
                    .update({
                        is_gold_verified: true,
                        subscription_expiry: newExpiryDate.toISOString()
                    })
                    .eq('id', existingTxn.user_id);

                console.log(`[Callback] Gold subscription activated for user ${existingTxn.user_id}`);
            } catch (goldError) {
                console.error('[Callback] Gold subscription activation error:', goldError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Gold subscription activation failed. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 5f. Handle Wholesale Purchase Fulfillment
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'WHOLESALE_PURCHASE' && !wasAlreadySuccess) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                const draftId = existingTxn.udf2;
                const amountPaise = Math.round(parseFloat(amount) * 100);

                const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
                    'finalize_wholesale_gateway_purchase',
                    {
                        p_draft_id: draftId,
                        p_amount_paise: amountPaise
                    }
                );

                if (rpcError || (rpcResult && !rpcResult.success)) {
                    console.error('[Callback] Wholesale fulfillment error:', rpcError?.message || rpcResult?.message);
                    fulfillmentFailed = true;
                    internalStatus = 'failed';
                    result.transMsg = 'Wholesale fulfillment failed. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
                } else {
                    console.log(`[Callback] Wholesale purchase fulfilled for txn ${clientTxnId}`);

                    try {
                        // Notify Merchant of successful stock purchase
                        await supabaseAdmin.from('notifications').insert({
                            user_id: existingTxn.user_id,
                            title: 'Stock Purchased Successfully 📦',
                            body: `Your wholesale order of ₹${amount} has been processed. Items are now in your inventory.`,
                            type: 'success',
                            reference_id: draftId,
                            reference_type: 'wholesale_purchase'
                        });
                    } catch (notificationError) {
                        console.error('[Callback] Failed to insert wholesale notification:', notificationError.message);
                    }
                }
            } catch (wholesaleError) {
                console.error('[Callback] Wholesale processing error:', wholesaleError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Wholesale processing error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
        }

        // 5g. Handle Merchant Subscription Fulfillment (first-time OR renewal)
        if (existingTxn && internalStatus === 'gateway_success' && existingTxn.udf1 === 'MERCHANT_SUBSCRIPTION' && !wasAlreadySuccess) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                const merchantId = existingTxn.udf2;

                // ── Security: Re-verify merchant ownership before mutating ──
                // Guards against tampered UDFs or replayed legacy transaction records.
                const { data: ownerCheck, error: ownerCheckErr } = await supabaseAdmin
                    .from('merchants')
                    .select('user_id')
                    .eq('id', merchantId)
                    .single();

                if (ownerCheckErr || !ownerCheck || ownerCheck.user_id !== existingTxn.user_id) {
                    console.error(
                        `[Callback] SECURITY: Merchant ownership mismatch for txn ${clientTxnId}. ` +
                        `Transaction user: ${existingTxn.user_id}, Merchant owner: ${ownerCheck?.user_id}. ` +
                        `Blocking subscription activation.`
                    );
                    throw new Error('Merchant ownership verification failed. Refusing to activate subscription.');
                }

                // Resolve plan duration from udf3 (e.g. "MSUB_6M").
                // Fall back to 30 days for any legacy ₹149 transactions with no plan key.
                const planKey = existingTxn.udf3 || null;
                const plan = MERCHANT_SUBSCRIPTION_PLANS.find(p => p.key === planKey);
                const durationDays = plan ? plan.durationDays : 30;
                const planLabel = plan ? plan.label : '1 Month (legacy)';

                // Fetch current merchant to know if first-time or renewal
                const { data: merchantCheck } = await supabaseAdmin
                    .from('merchants')
                    .select('subscription_status, subscription_expires_at')
                    .eq('id', merchantId)
                    .single();

                const currentExpiry = merchantCheck?.subscription_expires_at
                    ? new Date(merchantCheck.subscription_expires_at)
                    : null;
                const isRenewal = merchantCheck?.subscription_status === 'active' || Boolean(currentExpiry);
                const expiryBase = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();

                // Compute new expiry based on existing expiry for renewals so active plans are extended.
                const newExpiry = new Date(expiryBase.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
                const expiryFormatted = new Date(newExpiry).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                });

                // 1. Activate / Renew Subscription — always extend expiry on successful payment
                const { error: merchUpdateErr } = await supabaseAdmin
                    .from('merchants')
                    .update({
                        subscription_status: 'active',
                        subscription_expires_at: newExpiry
                    })
                    .eq('id', merchantId);

                if (merchUpdateErr) throw merchUpdateErr;

                // 1.5 Notify Merchant via WhatsApp
                try {
                    await notifyMerchantSubscriptionStatus({
                        merchantUserId: existingTxn.user_id,
                        status: isRenewal ? 'renewed' : 'activated',
                        expiry: expiryFormatted
                    });
                } catch (notifErr) {
                    console.error('[Callback] Failed to send merchant subscription notification:', notifErr);
                }

                // 2. Grant Merchant Role (only needed for first-time activation)
                if (!isRenewal) {
                    const { error: roleUpdateErr } = await supabaseAdmin
                        .from('user_profiles')
                        .update({ role: 'merchant' })
                        .eq('id', existingTxn.user_id);

                    if (roleUpdateErr) throw roleUpdateErr;

                    // 2.5 Distribute Referral Reward
                    try {
                        const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('distribute_merchant_referral_reward', {
                            p_new_merchant_id: merchantId
                        });
                        if (rewardError) {
                            console.error('[Callback] Error distributing merchant referral reward:', rewardError);
                        } else {
                            console.log('[Callback] Merchant referral reward result:', rewardData);
                        }
                    } catch (err) {
                        console.error('[Callback] Unexpected error distributing merchant referral reward:', err);
                    }

                    // 2.6 Distribute merchant_onboard reward points to customer referral upline
                    try {
                        const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                            p_event_type: 'merchant_onboard',
                            p_source_user_id: existingTxn.user_id,
                            p_reference_id: merchantId,
                            p_reference_type: 'merchant'
                        });
                        if (rewardError) {
                            console.error('[Callback] merchant_onboard reward RPC error:', rewardError);
                        } else {
                            logRewardRpcResult({
                                event_type: 'merchant_onboard',
                                source_user_id: existingTxn.user_id,
                                reference_id: merchantId,
                                reference_type: 'merchant',
                            }, rewardData);
                        }
                    } catch (rewardErr) {
                        console.error('[Callback] merchant_onboard reward distribution error (non-fatal):', rewardErr.message);
                    }
                }

                // 2.7 Distribute subscription_renewal reward points to customer referral upline
                if (isRenewal) {
                    try {
                        const renewalReferenceId = existingTxn.id;
                        const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                            p_event_type: 'subscription_renewal',
                            p_source_user_id: existingTxn.user_id,
                            p_reference_id: renewalReferenceId,
                            p_reference_type: 'merchant_subscription'
                        });
                        if (rewardError) {
                            console.error('[Callback] subscription_renewal reward RPC error:', rewardError);
                        } else {
                            logRewardRpcResult({
                                event_type: 'subscription_renewal',
                                source_user_id: existingTxn.user_id,
                                reference_id: renewalReferenceId,
                                reference_type: 'merchant_subscription',
                            }, rewardData);
                        }
                    } catch (rewardErr) {
                        console.error('[Callback] subscription_renewal reward distribution error (non-fatal):', rewardErr.message);
                    }
                }
            } catch (msubError) {
                console.error('[Callback] Merchant subscription processing error:', msubError.message);
                fulfillmentFailed = true;
                internalStatus = 'failed';
                result.transMsg = 'Merchant subscription activation error. Payment cannot be fulfilled automatically. Manual verification required. Contact support.';
            }
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
            // Merchant-specific redirects for immediate dashboard access
            if (existingTxn?.udf1 === 'MERCHANT_SUBSCRIPTION') {
                redirectPath = '/merchant/dashboard';
                redirectQuery = `?welcome=true&txnId=${clientTxnId}`;
            } else if (existingTxn?.udf1 === 'MERCHANT_TOPUP') {
                redirectPath = '/merchant/wallet';
                redirectQuery = `?success=true&txnId=${clientTxnId}`;
            } else if (existingTxn?.udf1 === 'WHOLESALE_PURCHASE') {
                redirectPath = '/merchant/inventory';
                redirectQuery = `?success=true&txnId=${clientTxnId}`;
            } else {
                // Default success page for customer transactions
                redirectPath = '/payment/success';
                redirectQuery = `?txnId=${clientTxnId}`;
            }
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

        return NextResponse.redirect(buildRedirectUrl(redirectPath + redirectQuery), 303);

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
