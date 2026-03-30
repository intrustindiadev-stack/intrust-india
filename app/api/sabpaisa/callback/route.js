// Force Node.js runtime — this route decrypts SabPaisa gateway responses using
// AES-256-GCM + HMAC-SHA384 via node:crypto (lib/sabpaisa/encrypt.js → decrypt).
// The Edge runtime does not expose Node crypto, so we must pin explicitly.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { decrypt } from '@/lib/sabpaisa/encrypt';
import { createClient } from '@supabase/supabase-js';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '@/lib/supabase/queries';
import { CustomerWalletService } from '@/lib/wallet/customerWalletService';
import { mapStatusToInternal } from '@/lib/sabpaisa/utils';
import { sabpaisaConfig } from '@/lib/sabpaisa/config';

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
            const url = new URL(path, request.url);
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') url.protocol = 'http:';
            return url;
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
        const wasAlreadySuccess = existingTxn && existingTxn.status === 'SUCCESS';

        let fulfillmentFailed = false;

        // 5. Handle Wallet Credit for WALLET_TOPUP safely
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'WALLET_TOPUP' && !wasAlreadySuccess) {
            try {
                await CustomerWalletService.creditWallet(
                    existingTxn.user_id,
                    amount,
                    'TOPUP',
                    `Wallet Topup via Sabpaisa (${result.paymentMode || 'Gateway'})`,
                    { id: clientTxnId, type: 'TOPUP' }
                );
                console.log(`[Callback] Wallet credited for txn ${clientTxnId}`);
            } catch (walletError) {
                console.error('[Callback] Failed to credit wallet:', walletError.message);
                fulfillmentFailed = true;
                internalStatus = 'FAILED';
                result.transMsg = 'Wallet credit failed. Payment will be refunded.';
            }
        }

        // 5b. Handle Merchant Wallet Credit for MERCHANT_TOPUP safely
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'MERCHANT_TOPUP' && !wasAlreadySuccess) {
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
                    } else {
                        console.error('[Callback] Merchant not found for topup:', existingTxn.user_id);
                        fulfillmentFailed = true;
                        internalStatus = 'FAILED';
                        result.transMsg = 'Merchant account not found. Payment will be refunded.';
                    }
                }
            } catch (walletError) {
                console.error('[Callback] Failed to credit merchant wallet:', walletError.message);
                fulfillmentFailed = true;
                internalStatus = 'FAILED';
                result.transMsg = 'Merchant wallet credit error. Payment will be refunded.';
            }
        }

        // 5c. Handle Udhari Payment Settlement via SabPaisa (gateway-funded)
        // NOTE: Uses settle_udhari_gateway_payment — NOT settle_udhari_payment.
        // The gateway already collected funds, so we must NOT debit the customer wallet.
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'UDHARI_PAYMENT' && !wasAlreadySuccess) {
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
                            p_customer_user_id:  existingTxn.user_id,
                            p_amount_paise:      amountPaise,
                            p_customer_email:    existingTxn.payer_email || null
                        }
                    );

                    if (rpcError) {
                        console.error('[Callback] Udhari gateway settlement RPC error:', rpcError.message);
                        fulfillmentFailed = true;
                        internalStatus = 'FAILED';
                        result.transMsg = 'Udhari settlement failed. Payment will be refunded.';
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
                        }
                    }
                }
            } catch (udhariError) {
                console.error('[Callback] Udhari payment processing error:', udhariError.message);
                fulfillmentFailed = true;
                internalStatus = 'FAILED';
                result.transMsg = 'Udhari processing error. Payment will be refunded.';
            }
        }

        // 5d. Handle Cart Checkout
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'CART_CHECKOUT' && !wasAlreadySuccess) {
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
                    console.error('[Callback] Cart checkout finalize error:', rpcError?.message || rpcResult?.message);
                    fulfillmentFailed = true;
                    internalStatus = 'FAILED';
                    result.transMsg = 'Cart order fulfillment failed. Payment will be refunded.';
                } else {
                    console.log(`[Callback] Cart checkout fulfilled for txn ${clientTxnId}`);
                    
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
                internalStatus = 'FAILED';
                result.transMsg = 'Cart checkout processing error. Payment will be refunded.';
            }
        }

        // 5e. Handle Cart Checkout Failure
        if (existingTxn && internalStatus !== 'SUCCESS' && existingTxn.udf1 === 'CART_CHECKOUT') {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                const groupId = existingTxn.udf2;
                await supabaseAdmin
                    .from('shopping_order_groups')
                    .update({ status: 'failed' })
                    .eq('id', groupId);
                console.log(`[Callback] Cart checkout marked as failed/aborted for txn ${clientTxnId}`);
            } catch (failError) {
                console.error('[Callback] Failed to flag cart checkout as failed:', failError.message);
            }
        }

        // 6. Handle Gift Card Purchase — Atomic coupon+order with rollback safety
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'GIFT_CARD' && !wasAlreadySuccess) {
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
                    internalStatus = 'FAILED';
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
                            const { error: orderError } = await supabaseAdmin
                                .from('orders')
                                .insert({
                                    user_id: existingTxn.user_id,
                                    merchant_id: updatedCoupon.merchant_id,
                                    giftcard_id: couponId,
                                    amount: amountPaise,
                                    payment_status: 'paid',
                                    created_at: new Date().toISOString()
                                });

                            if (orderError) {
                                console.error('[Callback] Order insert failed, rolling back coupon:', orderError.message);
                                await supabaseAdmin
                                    .from('coupons')
                                    .update({ status: 'available', purchased_by: null, purchased_at: null })
                                    .eq('id', couponId)
                                    .eq('purchased_by', existingTxn.user_id);
                                fulfillmentFailed = true;
                                internalStatus = 'FAILED';
                                result.transMsg = 'Order creation failed. Payment will be refunded.';
                            }
                        } else {
                            console.error('[Callback] Coupon mark-as-sold failed or already sold');
                            fulfillmentFailed = true;
                            internalStatus = 'FAILED';
                            result.transMsg = 'Gift card is no longer available. Payment will be refunded.';
                        }
                    } else {
                        console.error('[Callback] Missing couponId in udf2');
                        fulfillmentFailed = true;
                        internalStatus = 'FAILED';
                        result.transMsg = 'Invalid gift card selection. Payment will be refunded.';
                    }
                }
            } catch (gcError) {
                console.error('[Callback] Gift card processing error:', gcError.message);
                fulfillmentFailed = true;
                internalStatus = 'FAILED';
                result.transMsg = 'Gift card processing error. Payment will be refunded.';
            }
        }

        // 7. Handle Gold Subscription Activation
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'GOLD_SUBSCRIPTION' && !wasAlreadySuccess) {
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
                internalStatus = 'FAILED';
                result.transMsg = 'Gold subscription activation failed. Payment will be refunded.';
            }
        }

        // 7b. Catch-all: Downgrade to failure if fulfillment failed on any path but status wasn't reset
        if (fulfillmentFailed && internalStatus === 'SUCCESS') {
            internalStatus = 'FAILED';
            if (!result.transMsg || result.transMsg === status) {
                result.transMsg = 'Fulfillment error. Payment will be refunded.';
            }
        }

        // 4. Update Transaction Status
        if (clientTxnId && (!fulfillmentFailed || internalStatus !== 'SUCCESS')) {
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
                console.error('[Callback] Failed to update transaction:', updateErr.message);
            }
        }

        // 8. Redirect User based on Status
        let redirectPath = '/payment/failure';
        let redirectQuery = `?txnId=${clientTxnId}&msg=${encodeURIComponent(result.transMsg || 'Payment Failed')}`;

        if (internalStatus === 'SUCCESS') {
            redirectPath = '/payment/success';
            redirectQuery = `?txnId=${clientTxnId}`;
        } else if (internalStatus === 'PENDING') {
            redirectPath = '/payment/processing';
            redirectQuery = `?txnId=${clientTxnId}`;
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
