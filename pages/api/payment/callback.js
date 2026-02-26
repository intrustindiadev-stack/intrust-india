import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '../../../lib/supabase/queries';
import { CustomerWalletService } from '../../../lib/wallet/customerWalletService';
import { decrypt } from '../../../lib/sabpaisa/encryption';
import { mapStatusToInternal } from '../../../lib/sabpaisa/utils';
import { createClient } from '@supabase/supabase-js';

/**
 * Validates that the request IP is from a trusted source.
 * Configure SABPAISA_ALLOWED_IPS in env (comma-separated).
 * If not configured, allows all (for development).
 */
function isAllowedIP(req) {
    const allowedIPs = process.env.SABPAISA_ALLOWED_IPS;
    if (!allowedIPs) return true; // No whitelist configured — allow all (dev mode)

    const allowList = allowedIPs.split(',').map(ip => ip.trim()).filter(Boolean);
    if (allowList.length === 0) return true;

    // Extract client IP from various headers (Vercel, Nginx, direct)
    const clientIP = (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        ''
    ).replace('::ffff:', ''); // Strip IPv6 prefix

    return allowList.includes(clientIP);
}

export default async function handler(req, res) {
    // POST only — Sabpaisa docs specify POST for callbacks
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    // IP whitelist check
    if (!isAllowedIP(req)) {
        console.warn('[Callback] Blocked request from untrusted IP:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        console.log('[Callback] Received from IP:', req.headers['x-forwarded-for']?.split(',')[0] || 'direct');

        // Sabpaisa sends encrypted response in 'encResponse' parameter
        const encResponse = req.body.encResponse;

        if (!encResponse) {
            console.error('[Callback] Missing encResponse in payload');
            return res.redirect('/payment/failure?reason=invalid_response');
        }

        // 1. Decrypt using the unified encryption module
        const decryptedString = decrypt(encResponse);

        if (!decryptedString) {
            console.error('[Callback] Decryption failed');
            return res.redirect('/payment/failure?reason=decryption_failed');
        }

        // Strip any stray trailing quote characters from Sabpaisa UAT responses
        const cleanedDecrypted = decryptedString.replace(/"+$/, '').trim();

        // Parse query string response
        const params = new URLSearchParams(cleanedDecrypted);
        const result = {
            clientTxnId: params.get('clientTxnId'),
            sabpaisaTxnId: params.get('sabpaisaTxnId') || params.get('transId'),
            amount: params.get('amount'),
            status: params.get('status'),
            statusCode: params.get('statusCode'),
            paymentMode: params.get('paymentMode'),
            bankName: params.get('bankName'),
            transMsg: params.get('transMsg') || params.get('sabpaisaMessage'),
            bankTxnId: params.get('bankTxnId'),
            rrn: params.get('rrn')
        };

        if (!result.clientTxnId) {
            console.error('[Callback] Missing clientTxnId in response');
            return res.redirect('/payment/failure?reason=parse_failed');
        }

        const { clientTxnId, sabpaisaTxnId, status, amount, transMsg, bankTxnId, paymentMode } = result;

        // Map status to internal enum
        const internalStatus = mapStatusToInternal(result.statusCode || status);
        console.log(`[Callback] txn=${clientTxnId} status=${internalStatus} amount=${amount}`);

        // 2. Log Callback (log sanitized payload — no raw enc data)
        if (clientTxnId) {
            await logTransactionEvent(clientTxnId, 'CALLBACK', {
                statusCode: result.statusCode,
                status: result.status,
                paymentMode,
                bankTxnId,
                sabpaisaTxnId
            }, transMsg || status);
        }

        // 3. Get Existing Transaction to Check Type
        const existingTxn = await getTransactionByClientTxnId(clientTxnId);

        // 4. Update Transaction Status (if it wasn't already SUCCESS)
        const wasAlreadySuccess = existingTxn && existingTxn.status === 'SUCCESS';

        if (clientTxnId) {
            try {
                await updateTransaction(clientTxnId, {
                    status: internalStatus,
                    sabpaisa_txn_id: sabpaisaTxnId,
                    paid_amount: amount,
                    sabpaisa_message: transMsg || status,
                    bank_txn_id: bankTxnId,
                    payment_mode: paymentMode,
                    status_code: result.statusCode || status
                });
            } catch (updateErr) {
                console.error('[Callback] Failed to update transaction:', updateErr.message);
            }
        }

        // 5. Handle Wallet Credit for WALLET_TOPUP safely
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'WALLET_TOPUP') {
            if (!wasAlreadySuccess) {
                try {
                    await CustomerWalletService.creditWallet(
                        existingTxn.user_id,
                        amount,
                        'TOPUP',
                        `Wallet Topup via Sabpaisa (${paymentMode || 'Gateway'})`,
                        { id: clientTxnId, type: 'TOPUP' }
                    );
                    console.log(`[Callback] Wallet credited for txn ${clientTxnId}`);
                } catch (walletError) {
                    console.error('[Callback] Failed to credit wallet:', walletError.message);
                }
            }
        }

        // 6. Handle Gift Card Purchase — Atomic coupon+order with rollback safety
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'GIFT_CARD' && !wasAlreadySuccess) {
            try {
                const couponId = existingTxn.udf2;
                if (couponId) {
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY
                    );

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
                        .select('id')
                        .single();

                    if (updateCouponError || !updatedCoupon) {
                        console.error('[Callback] Coupon not available or update failed:', updateCouponError?.message);
                    } else {
                        // Step B: Create order record
                        const amountPaise = Math.round(parseFloat(amount) * 100);
                        const { error: orderError } = await supabaseAdmin
                            .from('orders')
                            .insert({
                                user_id: existingTxn.user_id,
                                giftcard_id: couponId,
                                amount: amountPaise,
                                payment_status: 'paid',
                                created_at: new Date().toISOString()
                            });

                        if (orderError) {
                            // ROLLBACK: If order insert fails, revert coupon status
                            console.error('[Callback] Order insert failed, rolling back coupon:', orderError.message);
                            await supabaseAdmin
                                .from('coupons')
                                .update({ status: 'available', purchased_by: null, purchased_at: null })
                                .eq('id', couponId)
                                .eq('purchased_by', existingTxn.user_id);
                        } else {
                            console.log(`[Callback] Gift card order created for coupon ${couponId}`);
                        }
                    }
                }
            } catch (gcError) {
                console.error('[Callback] Gift card processing error:', gcError.message);
            }
        }

        // 7. Handle Gold Subscription Success
        if (existingTxn && internalStatus === 'SUCCESS' && existingTxn.udf1 === 'GOLD_SUBSCRIPTION') {
            if (!wasAlreadySuccess) {
                try {
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY
                    );

                    const { data: profile } = await supabaseAdmin
                        .from('user_profiles')
                        .select('is_gold_verified, subscription_expiry')
                        .eq('id', existingTxn.user_id)
                        .single();

                    const packageId = existingTxn.udf2 || 'GOLD_1Y';
                    let monthsToAdd = 12;
                    let cashbackAmount = 1499.00;

                    if (packageId === 'GOLD_1M') { monthsToAdd = 1; cashbackAmount = 199.00; }
                    else if (packageId === 'GOLD_3M') { monthsToAdd = 3; cashbackAmount = 499.00; }

                    let baseDate = new Date();
                    if (profile?.is_gold_verified && profile?.subscription_expiry) {
                        const currentExpiry = new Date(profile.subscription_expiry);
                        if (currentExpiry > baseDate) baseDate = currentExpiry;
                    }

                    const newExpiryDate = new Date(baseDate);
                    newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

                    const { error: profileError } = await supabaseAdmin
                        .from('user_profiles')
                        .update({
                            is_gold_verified: true,
                            subscription_expiry: newExpiryDate.toISOString(),
                            updated_at: new Date()
                        })
                        .eq('id', existingTxn.user_id);

                    if (profileError) throw profileError;

                    await CustomerWalletService.creditWallet(
                        existingTxn.user_id,
                        cashbackAmount,
                        'CASHBACK',
                        `Gold ${monthsToAdd}M Subscription Cashback Reward`,
                        { id: clientTxnId, type: 'SUBSCRIPTION', package: packageId }
                    );
                    console.log(`[Callback] Gold subscription processed for user ${existingTxn.user_id}`);
                } catch (goldError) {
                    console.error('[Callback] Gold subscription error:', goldError.message);
                }
            }
        }

        // 8. Redirect User based on Status
        if (internalStatus === 'SUCCESS') {
            res.redirect(`/payment/success?txnId=${clientTxnId}`);
        } else if (internalStatus === 'PENDING') {
            res.redirect(`/payment/processing?txnId=${clientTxnId}`);
        } else {
            res.redirect(`/payment/failure?txnId=${clientTxnId}&msg=${encodeURIComponent(transMsg || 'Payment Failed')}`);
        }

    } catch (error) {
        console.error('[Callback] Unhandled error:', error.message);
        res.redirect('/payment/failure?reason=internal_error');
    }
}
