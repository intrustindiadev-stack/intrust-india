import SabpaisaClient from '../../../lib/sabpaisa/client';
import { updateTransaction, logTransactionEvent, getTransactionByClientTxnId } from '../../../lib/supabase/queries';
import { CustomerWalletService } from '../../../lib/wallet/customerWalletService';
import { createClient } from '@supabase/supabase-js';
import { logRewardRpcResult } from '../../../lib/rewardRpcResult';
import { notifyRewardEarned } from '../../../lib/rewardNotifications';

/**
 * Validates that the request IP is from a trusted source.
 * Configure SABPAISA_ALLOWED_IPS in env (comma-separated).
 */
function isAllowedIP(req) {
    const allowedIPs = process.env.SABPAISA_ALLOWED_IPS;
    if (!allowedIPs) return true;

    const allowList = allowedIPs.split(',').map(ip => ip.trim()).filter(Boolean);
    if (allowList.length === 0) return true;

    const clientIP = (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        ''
    ).replace('::ffff:', '');

    return allowList.includes(clientIP);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // IP whitelist check
    if (!isAllowedIP(req)) {
        console.warn('[Webhook] Blocked from untrusted IP:', req.headers['x-forwarded-for'] || req.socket?.remoteAddress);
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        // Sabpaisa webhook sends "encryptedResponse" (NOT "encResponse")
        const { encryptedResponse, clientCode } = req.body;

        if (!encryptedResponse) {
            console.error('[Webhook] Missing encryptedResponse in payload. Keys:', Object.keys(req.body));
            return res.status(400).json({ error: 'Invalid payload — missing encryptedResponse' });
        }

        const result = SabpaisaClient.parseResponse(encryptedResponse);
        if (!result) {
            return res.status(400).json({ error: 'Decryption failed' });
        }

        const { clientTxnId, internalStatus, message, amount, paymentMode, sabpaisaTxnId } = result;

        await logTransactionEvent(clientTxnId, 'WEBHOOK', {
            statusCode: result.statusCode,
            status: result.status,
            paymentMode,
            sabpaisaTxnId
        }, message);

        // Idempotency check: Don't update if already in a final state
        const currentTxn = await getTransactionByClientTxnId(clientTxnId);
        if (!currentTxn) {
            // Respond with Sabpaisa's expected format even on 404
            return res.status(404).json({
                status: 404,
                message: 'Transaction not found',
                data: { statusCode: '00', message: 'Transaction not found', sabpaisaTxnId: sabpaisaTxnId || '' },
                errors: 'null'
            });
        }

        if (['gateway_success', 'failed', 'aborted'].includes(currentTxn.status)) {
            console.log(`Transaction ${clientTxnId} already in final state: ${currentTxn.status}. Acknowledging webhook.`);
            return res.status(200).json({
                status: 200,
                message: 'API_SUCCESSFULL_MESSAGE',
                data: {
                    statusCode: '01',
                    message: 'Data successfully processed',
                    sabpaisaTxnId: sabpaisaTxnId || ''
                },
                errors: 'null'
            });
        }

        // Update Status
        await updateTransaction(clientTxnId, {
            status: internalStatus,
            sabpaisa_txn_id: sabpaisaTxnId,
            webhook_received: true,
            sabpaisa_message: message,
            paid_amount: amount,
            status_code: result.statusCode
        });

        // Handle WALLET_TOPUP credit
        if (internalStatus === 'gateway_success' && currentTxn.udf1 === 'WALLET_TOPUP') {
            try {
                await CustomerWalletService.creditWallet(
                    currentTxn.user_id,
                    amount || currentTxn.amount,
                    'TOPUP',
                    `Wallet Topup via Sabpaisa Webhook (${paymentMode || 'Gateway'})`,
                    { id: clientTxnId, type: 'TOPUP' }
                );

                // Distribute wallet_topup reward (non-blocking — must not fail the wallet credit)
                try {
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY
                    );
                    const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                        p_event_type: 'wallet_topup',
                        p_source_user_id: currentTxn.user_id,
                        p_reference_id: currentTxn.id,
                        p_reference_type: 'wallet_topup',
                        p_amount_paise: Math.round(parseFloat(amount || currentTxn.amount) * 100)
                    });
                    if (rewardError) {
                        console.error('[Webhook] Wallet topup reward RPC error:', rewardError);
                    } else {
                        const rewardResult = logRewardRpcResult({
                            event_type: 'wallet_topup',
                            source_user_id: currentTxn.user_id,
                            reference_id: currentTxn.id,
                            reference_type: 'wallet_topup',
                        }, rewardData);

                        await notifyRewardEarned({
                            supabaseAdmin,
                            userId: currentTxn.user_id,
                            eventType: 'wallet_topup',
                            totalDistributed: rewardResult?.totalDistributed || 0,
                            referenceId: currentTxn.id,
                            referenceType: 'wallet_topup',
                        });
                    }
                } catch (rewardErr) {
                    console.error('[Webhook] Wallet topup reward distribution error:', rewardErr.message);
                }
            } catch (walletError) {
                console.error('Webhook: Failed to credit wallet:', walletError);
            }
        }

        // Handle GIFT_CARD purchase
        if (internalStatus === 'gateway_success' && currentTxn.udf1 === 'GIFT_CARD') {
            try {
                const couponId = currentTxn.udf2;
                if (couponId) {
                    const supabaseAdmin = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL,
                        process.env.SUPABASE_SERVICE_ROLE_KEY
                    );

                    // Check if an order already exists for this coupon (idempotency guard)
                    const { data: existingOrder } = await supabaseAdmin
                        .from('orders')
                        .select('id')
                        .eq('giftcard_id', couponId)
                        .maybeSingle();

                    if (existingOrder) {
                        console.log(`[Webhook] Order already exists for coupon ${couponId} — skipping duplicate creation.`);
                    } else {
                        const { data: updatedCoupon, error: updateCouponError } = await supabaseAdmin
                            .from('coupons')
                            .update({
                                status: 'sold',
                                purchased_by: currentTxn.user_id,
                                purchased_at: new Date().toISOString()
                            })
                            .eq('id', couponId)
                            .eq('status', 'available')
                            .select('id')
                            .single();

                        if (!updateCouponError && updatedCoupon) {
                            const amountPaise = Math.round(parseFloat(amount || currentTxn.amount) * 100);
                            const { error: orderError } = await supabaseAdmin.from('orders').insert({
                                user_id: currentTxn.user_id,
                                giftcard_id: couponId,
                                amount: amountPaise,
                                payment_status: 'paid',
                                created_at: new Date().toISOString()
                            });

                            if (orderError) {
                                // Unique constraint violation (23505) means callback already created the order — safe to ignore
                                if (orderError.code === '23505') {
                                    console.log(`[Webhook] Order for coupon ${couponId} already created by callback — idempotent no-op.`);
                                } else {
                                    // Genuine insert failure — rollback coupon status
                                    console.error('[Webhook] Order insert failed, rolling back coupon:', orderError.message);
                                    await supabaseAdmin
                                        .from('coupons')
                                        .update({ status: 'available', purchased_by: null, purchased_at: null })
                                        .eq('id', couponId)
                                        .eq('purchased_by', currentTxn.user_id);
                                }
                            } else {
                                console.log(`[Webhook] Gift card order created for coupon ${couponId}`);
                            }
                        }
                    }
                }
            } catch (gcError) {
                console.error('Webhook: Failed to process gift card:', gcError);
            }
        }

        // Handle GOLD_SUBSCRIPTION
        if (internalStatus === 'gateway_success' && currentTxn.udf1 === 'GOLD_SUBSCRIPTION') {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                const { data: profile } = await supabaseAdmin
                    .from('user_profiles')
                    .select('is_gold_verified, subscription_expiry')
                    .eq('id', currentTxn.user_id)
                    .single();

                const packageId = currentTxn.udf2 || 'GOLD_1Y';
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

                await supabaseAdmin.from('user_profiles').update({
                    is_gold_verified: true,
                    subscription_expiry: newExpiryDate.toISOString(),
                    updated_at: new Date()
                }).eq('id', currentTxn.user_id);

                await CustomerWalletService.creditWallet(
                    currentTxn.user_id,
                    cashbackAmount,
                    'CASHBACK',
                    `Gold ${monthsToAdd}M Subscription Cashback Reward`,
                    { id: clientTxnId, type: 'SUBSCRIPTION', package: packageId }
                );
            } catch (goldError) {
                console.error('Webhook: Failed to process gold subscription:', goldError);
            }
        }

        // Return Sabpaisa's expected acknowledgement format
        res.status(200).json({
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
        console.error('Webhook Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
