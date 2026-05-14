/**
 * lib/sabpaisa/fulfillment.js
 *
 * Shared fulfillment logic for all SabPaisa transaction types.
 * Called by both /api/sabpaisa/callback and /api/sabpaisa/webhook
 * so that fulfillment behaviour is always consistent regardless of
 * which surface receives the confirmation first.
 *
 * Exports:
 *   fulfillTransaction(supabaseAdmin, txn, internalStatus, gatewayPayload)
 */

import { CustomerWalletService } from '@/lib/wallet/customerWalletService';
import { MERCHANT_SUBSCRIPTION_PLANS, GOLD_SUBSCRIPTION_PLANS } from '@/lib/constants';
import { logRewardRpcResult } from '@/lib/rewardRpcResult';
import { notifyRewardEarned } from '@/lib/rewardNotifications';
import {
    notifyMerchantSubscriptionStatus,
    notifyMerchantGiftCardSold,
    notifyMerchantStoreCreditPaid,
} from '@/lib/notifications/merchantWhatsapp';

/**
 * Executes the post-payment fulfillment steps for a completed transaction.
 *
 * @param {object} supabaseAdmin - Service-role Supabase client.
 * @param {object} txn - Transaction record from `transactions` table.
 * @param {string} internalStatus - Mapped internal status (e.g. 'gateway_success').
 * @param {object} gatewayPayload - Decrypted gateway response fields.
 *   Expected: { clientTxnId, amount, paymentMode, sabpaisaTxnId, transMsg }
 * @returns {{ fulfillmentFailed: boolean, internalStatus: string, transMsg: string }}
 */
export async function fulfillTransaction(supabaseAdmin, txn, internalStatus, gatewayPayload) {
    const { clientTxnId, amount, paymentMode } = gatewayPayload;
    let fulfillmentFailed = false;
    let transMsg = gatewayPayload.transMsg || internalStatus;

    if (!txn || internalStatus !== 'gateway_success') {
        return { fulfillmentFailed, internalStatus, transMsg };
    }

    // ─── WALLET_TOPUP ────────────────────────────────────────────────────────
    if (txn.udf1 === 'WALLET_TOPUP') {
        try {
            await CustomerWalletService.creditWallet(
                txn.user_id,
                amount,
                'TOPUP',
                `Wallet Topup via Sabpaisa (${paymentMode || 'Gateway'})`,
                { id: clientTxnId, type: 'TOPUP' }
            );
            console.log(`[Fulfillment] Wallet credited for txn ${clientTxnId}`);

            await supabaseAdmin.from('notifications').insert([{
                user_id: txn.user_id,
                title: 'Wallet Topped Up ✅',
                body: `Your wallet has been credited with ₹${amount}.`,
                type: 'success',
                reference_type: 'wallet_topup',
                reference_id: clientTxnId
            }]);

            // Distribute rewards (non-blocking)
            try {
                const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                    p_event_type: 'wallet_topup',
                    p_source_user_id: txn.user_id,
                    p_reference_id: txn.id,
                    p_reference_type: 'wallet_topup',
                    p_amount_paise: Math.round(parseFloat(amount) * 100)
                });
                if (!rewardError) {
                    logRewardRpcResult({ event_type: 'wallet_topup', source_user_id: txn.user_id, reference_id: txn.id, reference_type: 'wallet_topup' }, rewardData);
                    await notifyRewardEarned({ supabaseAdmin, userId: txn.user_id, eventType: 'wallet_topup', totalDistributed: rewardData?.total_distributed, referenceId: txn.id, referenceType: 'wallet_topup' }).catch(() => {});
                }
            } catch (rewardErr) {
                console.error('[Fulfillment] Wallet topup reward error:', rewardErr.message);
            }
        } catch (err) {
            console.error('[Fulfillment] WALLET_TOPUP credit failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = 'Wallet credit failed. Manual verification required. Contact support.';
        }
    }

    // ─── MERCHANT_TOPUP ──────────────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'MERCHANT_TOPUP') {
        try {
            // Idempotency
            const { data: existingCredit } = await supabaseAdmin
                .from('merchant_transactions')
                .select('id')
                .eq('metadata->>id', clientTxnId)
                .eq('metadata->>type', 'MERCHANT_TOPUP')
                .maybeSingle();

            if (existingCredit) {
                console.log(`[Fulfillment] Merchant topup already applied for txn ${clientTxnId}`);
            } else {
                const { data: merchant, error: merchantErr } = await supabaseAdmin
                    .from('merchants')
                    .select('id, wallet_balance_paise')
                    .eq('user_id', txn.user_id)
                    .single();

                if (merchantErr || !merchant) {
                    throw new Error(`Merchant not found for user ${txn.user_id}`);
                }

                const amountPaise = Math.round(parseFloat(amount) * 100);
                const newBalance = merchant.wallet_balance_paise + amountPaise;

                const { error: balErr } = await supabaseAdmin
                    .from('merchants')
                    .update({ wallet_balance_paise: newBalance, updated_at: new Date().toISOString() })
                    .eq('id', merchant.id);
                if (balErr) throw balErr;

                const { error: txErr } = await supabaseAdmin
                    .from('merchant_transactions')
                    .insert({
                        merchant_id: merchant.id,
                        transaction_type: 'wallet_topup',
                        amount_paise: amountPaise,
                        commission_paise: 0,
                        balance_after_paise: newBalance,
                        description: `Wallet Topup via Sabpaisa (${paymentMode || 'Gateway'})`,
                        metadata: { id: clientTxnId, type: 'MERCHANT_TOPUP' }
                    });

                if (txErr) {
                    // Rollback
                    await supabaseAdmin.from('merchants').update({ wallet_balance_paise: merchant.wallet_balance_paise, updated_at: new Date().toISOString() }).eq('id', merchant.id);
                    throw txErr;
                }

                await supabaseAdmin.from('notifications').insert([{
                    user_id: txn.user_id,
                    title: 'Wallet Funded ✅',
                    body: `Your merchant wallet has been credited with ₹${amount}.`,
                    type: 'success',
                    reference_type: 'merchant_wallet_topup',
                    reference_id: clientTxnId
                }]);
            }
        } catch (err) {
            console.error('[Fulfillment] MERCHANT_TOPUP credit failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = 'Merchant wallet credit failed. Manual verification required. Contact support.';
        }
    }

    // ─── UDHARI_PAYMENT ──────────────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'UDHARI_PAYMENT') {
        try {
            const udhariRequestId = txn.udf2;
            const merchantId = txn.udf3;

            const { data: existingSettlement } = await supabaseAdmin
                .from('udhari_requests')
                .select('id, status')
                .eq('id', udhariRequestId)
                .eq('status', 'completed')
                .maybeSingle();

            if (existingSettlement) {
                console.log(`[Fulfillment] Udhari already settled for txn ${clientTxnId}`);
            } else {
                const amountPaise = Math.round(parseFloat(amount) * 100);
                const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('settle_udhari_gateway_payment', {
                    p_udhari_request_id: udhariRequestId,
                    p_customer_user_id: txn.user_id,
                    p_amount_paise: amountPaise,
                    p_customer_email: txn.payer_email || null
                });

                if (rpcError) throw rpcError;

                const { data: merchant } = await supabaseAdmin.from('merchants').select('user_id').eq('id', merchantId).single();
                if (merchant) {
                    await supabaseAdmin.from('notifications').insert({
                        user_id: merchant.user_id,
                        title: 'Store Credit Payment Received ✅',
                        body: `A store credit payment of ₹${amount} has been received via UPI/Card.`,
                        type: 'success',
                        reference_id: udhariRequestId,
                        reference_type: 'udhari_completed'
                    });
                    notifyMerchantStoreCreditPaid({ merchantUserId: merchant.user_id, amountRs: amount, item: udhariRequestId.slice(0, 8).toUpperCase() }).catch(e => console.error('[Fulfillment] Udhari WhatsApp error:', e));
                }
            }
        } catch (err) {
            console.error('[Fulfillment] UDHARI_PAYMENT failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = 'Udhari settlement failed. Manual verification required. Contact support.';
        }
    }

    // ─── CART_CHECKOUT ───────────────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'CART_CHECKOUT') {
        try {
            const groupId = txn.udf2;
            const amountPaise = Math.round(parseFloat(amount) * 100);

            const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('finalize_gateway_orders', {
                p_group_id: groupId,
                p_customer_id: txn.user_id,
                p_amount_paise: amountPaise
            });

            if (rpcError || (rpcResult && !rpcResult.success)) {
                throw new Error(rpcError?.message || rpcResult?.message || 'Unknown fulfillment error');
            }

            // Rewards
            try {
                const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                    p_event_type: 'purchase', p_source_user_id: txn.user_id, p_reference_id: groupId, p_reference_type: 'shopping_order', p_amount_paise: amountPaise
                });
                if (!rewardError) {
                    logRewardRpcResult({ event_type: 'purchase', source_user_id: txn.user_id, reference_id: groupId, reference_type: 'shopping_order' }, rewardData);
                    await notifyRewardEarned({ supabaseAdmin, userId: txn.user_id, eventType: 'purchase', totalDistributed: rewardData?.total_distributed, referenceId: groupId, referenceType: 'shopping_order' }).catch(() => {});
                }
            } catch (rewardErr) {
                console.error('[Fulfillment] Cart reward error:', rewardErr.message);
            }

            await supabaseAdmin.from('notifications').insert({
                user_id: txn.user_id,
                title: 'Order Placed Successfully ✅',
                body: `Your order of ₹${amount} has been confirmed. Track it in your orders.`,
                type: 'success',
                reference_id: groupId,
                reference_type: 'shopping_order'
            });

            const { data: adminProfiles } = await supabaseAdmin.from('user_profiles').select('id').eq('role', 'admin');
            if (adminProfiles?.length > 0) {
                await supabaseAdmin.from('notifications').insert(adminProfiles.map(ap => ({
                    user_id: ap.id,
                    title: 'New Platform Order 🛍️',
                    body: `A new shopping order of ₹${amount} has been placed (ID: ${groupId.slice(0, 8).toUpperCase()}).`,
                    type: 'info',
                    reference_id: groupId,
                    reference_type: 'shopping_order'
                })));
            }
        } catch (err) {
            console.error('[Fulfillment] CART_CHECKOUT failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = `Cart fulfillment failed: ${err.message}. Manual verification required. Contact support.`;
        }
    }

    // ─── NFC_ORDER ───────────────────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'NFC_ORDER') {
        try {
            const nfcOrderId = txn.udf2;

            const { data: nfcOrder } = await supabaseAdmin.from('nfc_orders').select('id, payment_status').eq('id', nfcOrderId).single();

            if (nfcOrder?.payment_status === 'paid') {
                console.log(`[Fulfillment] NFC order ${nfcOrderId} already paid — skipping.`);
            } else {
                const { error: nfcErr } = await supabaseAdmin
                    .from('nfc_orders')
                    .update({ payment_status: 'paid', status: 'confirmed' })
                    .eq('id', nfcOrderId)
                    .neq('payment_status', 'paid');

                if (nfcErr) throw nfcErr;

                await supabaseAdmin.from('notifications').insert({
                    user_id: txn.user_id,
                    title: 'NFC Card Order Confirmed ✅',
                    body: `Your NFC card order of ₹${amount} has been confirmed and will be dispatched soon.`,
                    type: 'success',
                    reference_id: nfcOrderId,
                    reference_type: 'nfc_order'
                });
            }
        } catch (err) {
            console.error('[Fulfillment] NFC_ORDER failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = 'NFC order fulfillment failed. Manual verification required. Contact support.';
        }
    }

    // ─── GIFT_CARD ───────────────────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'GIFT_CARD') {
        try {
            const { data: profile } = await supabaseAdmin.from('user_profiles').select('kyc_status').eq('id', txn.user_id).single();
            if (!profile || profile.kyc_status !== 'verified') {
                throw new Error('KYC Policy Block: Verification required for gift cards');
            }

            const couponId = txn.udf2;
            if (!couponId) throw new Error('Missing coupon ID in udf2');

            const { data: updatedCoupon, error: couponErr } = await supabaseAdmin
                .from('coupons')
                .update({ status: 'sold', purchased_by: txn.user_id, purchased_at: new Date().toISOString() })
                .eq('id', couponId)
                .eq('status', 'available')
                .select('id, merchant_id')
                .single();

            if (couponErr || !updatedCoupon) {
                throw new Error('Gift card is no longer available or already sold');
            }

            const amountPaise = Math.round(parseFloat(amount) * 100);
            const { data: newOrder, error: orderErr } = await supabaseAdmin
                .from('orders')
                .insert({ user_id: txn.user_id, merchant_id: updatedCoupon.merchant_id, giftcard_id: couponId, amount: amountPaise, payment_status: 'paid', created_at: new Date().toISOString() })
                .select('id')
                .single();

            if (orderErr) {
                // Rollback coupon
                await supabaseAdmin.from('coupons').update({ status: 'available', purchased_by: null, purchased_at: null }).eq('id', couponId).eq('purchased_by', txn.user_id);
                throw orderErr;
            }

            await supabaseAdmin.from('notifications').insert({
                user_id: txn.user_id,
                title: 'Gift Card Purchased ✅',
                body: `You successfully purchased a gift card worth ₹${amount}.`,
                type: 'success',
                reference_id: newOrder.id,
                reference_type: 'gift_card_purchase'
            });

            const { data: merchantDetails } = await supabaseAdmin.from('merchants').select('user_id').eq('id', updatedCoupon.merchant_id).single();
            if (merchantDetails?.user_id) {
                await supabaseAdmin.from('notifications').insert({
                    user_id: merchantDetails.user_id,
                    title: 'Gift Card Sold 💳',
                    body: `A customer purchased a gift card worth ₹${amount}.`,
                    type: 'success',
                    reference_id: newOrder.id,
                    reference_type: 'gift_card_purchase'
                });
                notifyMerchantGiftCardSold({ merchantUserId: merchantDetails.user_id, amountRs: amount, brand: 'Store Gift Card' }).catch(e => console.error('[Fulfillment] Gift card WhatsApp error:', e));
            }

            // Rewards
            try {
                const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                    p_event_type: 'purchase', p_source_user_id: txn.user_id, p_reference_id: couponId, p_reference_type: 'gift_card_purchase', p_amount_paise: amountPaise
                });
                if (!rewardError) {
                    logRewardRpcResult({ event_type: 'purchase', source_user_id: txn.user_id, reference_id: couponId, reference_type: 'gift_card_purchase' }, rewardData);
                    await notifyRewardEarned({ supabaseAdmin, userId: txn.user_id, eventType: 'purchase', totalDistributed: rewardData?.total_distributed, referenceId: couponId, referenceType: 'gift_card_purchase' }).catch(() => {});
                }
            } catch (rewardErr) {
                console.error('[Fulfillment] Gift card reward error:', rewardErr.message);
            }
        } catch (err) {
            console.error('[Fulfillment] GIFT_CARD failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = `Gift card processing failed: ${err.message}. Manual verification required. Contact support.`;
        }
    }

    // ─── GOLD_SUBSCRIPTION ───────────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'GOLD_SUBSCRIPTION') {
        try {
            const packageId = txn.udf2;
            const plan = GOLD_SUBSCRIPTION_PLANS.find(p => p.key === packageId);
            const monthsToAdd = plan ? plan.durationMonths : (packageId === 'GOLD_1M' ? 1 : packageId === 'GOLD_3M' ? 3 : 12);

            const { data: profile } = await supabaseAdmin.from('user_profiles').select('is_gold_verified, subscription_expiry').eq('id', txn.user_id).single();

            let baseDate = new Date();
            if (profile?.is_gold_verified && profile?.subscription_expiry) {
                const currentExpiry = new Date(profile.subscription_expiry);
                if (currentExpiry > baseDate) baseDate = currentExpiry;
            }

            const newExpiryDate = new Date(baseDate);
            newExpiryDate.setMonth(newExpiryDate.getMonth() + monthsToAdd);

            await supabaseAdmin.from('user_profiles').update({ is_gold_verified: true, subscription_expiry: newExpiryDate.toISOString() }).eq('id', txn.user_id);

            console.log(`[Fulfillment] Gold subscription activated for user ${txn.user_id}`);
        } catch (err) {
            console.error('[Fulfillment] GOLD_SUBSCRIPTION failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = 'Gold subscription activation failed. Manual verification required. Contact support.';
        }
    }

    // ─── WHOLESALE_PURCHASE ──────────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'WHOLESALE_PURCHASE') {
        try {
            const draftId = txn.udf2;
            const amountPaise = Math.round(parseFloat(amount) * 100);

            const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('finalize_wholesale_gateway_purchase', {
                p_draft_id: draftId,
                p_amount_paise: amountPaise
            });

            if (rpcError || (rpcResult && !rpcResult.success)) {
                throw new Error(rpcError?.message || rpcResult?.message || 'Unknown error');
            }

            await supabaseAdmin.from('notifications').insert({
                user_id: txn.user_id,
                title: 'Stock Purchased Successfully 📦',
                body: `Your wholesale order of ₹${amount} has been processed. Items are now in your inventory.`,
                type: 'success',
                reference_id: draftId,
                reference_type: 'wholesale_purchase'
            });
        } catch (err) {
            console.error('[Fulfillment] WHOLESALE_PURCHASE failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = 'Wholesale fulfillment failed. Manual verification required. Contact support.';
        }
    }

    // ─── MERCHANT_SUBSCRIPTION ───────────────────────────────────────────────
    if (!fulfillmentFailed && txn.udf1 === 'MERCHANT_SUBSCRIPTION') {
        try {
            const merchantId = txn.udf2;

            // Security: Re-verify merchant ownership
            const { data: ownerCheck, error: ownerErr } = await supabaseAdmin.from('merchants').select('user_id').eq('id', merchantId).single();
            if (ownerErr || !ownerCheck || ownerCheck.user_id !== txn.user_id) {
                throw new Error('Merchant ownership verification failed. Refusing to activate subscription.');
            }

            const planKey = txn.udf3 || null;
            const plan = MERCHANT_SUBSCRIPTION_PLANS.find(p => p.key === planKey);
            const durationDays = plan ? plan.durationDays : 30;
            const planLabel = plan ? plan.label : '1 Month (legacy)';

            const { data: merchantCheck } = await supabaseAdmin.from('merchants').select('subscription_status, subscription_expires_at').eq('id', merchantId).single();
            const currentExpiry = merchantCheck?.subscription_expires_at ? new Date(merchantCheck.subscription_expires_at) : null;
            const isRenewal = merchantCheck?.subscription_status === 'active' || Boolean(currentExpiry);
            const expiryBase = currentExpiry && currentExpiry > new Date() ? currentExpiry : new Date();
            const newExpiry = new Date(expiryBase.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
            const expiryFormatted = new Date(newExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

            const { error: merchUpdateErr } = await supabaseAdmin.from('merchants').update({ subscription_status: 'active', subscription_expires_at: newExpiry }).eq('id', merchantId);
            if (merchUpdateErr) throw merchUpdateErr;

            try {
                await notifyMerchantSubscriptionStatus({ merchantUserId: txn.user_id, status: isRenewal ? 'renewed' : 'activated', expiry: expiryFormatted });
            } catch (notifErr) {
                console.error('[Fulfillment] WhatsApp merchant subscription notification failed:', notifErr);
            }

            if (!isRenewal) {
                const { error: roleErr } = await supabaseAdmin.from('user_profiles').update({ role: 'merchant' }).eq('id', txn.user_id);
                if (roleErr) throw roleErr;

                try {
                    const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('distribute_merchant_referral_reward', { p_new_merchant_id: merchantId });
                    if (rewardError) console.error('[Fulfillment] Merchant referral reward error:', rewardError);
                } catch (err) {
                    console.error('[Fulfillment] Merchant referral reward unexpected error:', err);
                }

                try {
                    const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', { p_event_type: 'merchant_onboard', p_source_user_id: txn.user_id, p_reference_id: merchantId, p_reference_type: 'merchant' });
                    if (!rewardError) logRewardRpcResult({ event_type: 'merchant_onboard', source_user_id: txn.user_id, reference_id: merchantId, reference_type: 'merchant' }, rewardData);
                } catch (rewardErr) {
                    console.error('[Fulfillment] merchant_onboard reward error:', rewardErr.message);
                }
            }

            if (isRenewal) {
                try {
                    const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', { p_event_type: 'subscription_renewal', p_source_user_id: txn.user_id, p_reference_id: txn.id, p_reference_type: 'merchant_subscription' });
                    if (!rewardError) logRewardRpcResult({ event_type: 'subscription_renewal', source_user_id: txn.user_id, reference_id: txn.id, reference_type: 'merchant_subscription' }, rewardData);
                } catch (rewardErr) {
                    console.error('[Fulfillment] subscription_renewal reward error:', rewardErr.message);
                }
            }
        } catch (err) {
            console.error('[Fulfillment] MERCHANT_SUBSCRIPTION failed:', err.message);
            fulfillmentFailed = true;
            internalStatus = 'failed';
            transMsg = 'Merchant subscription activation failed. Manual verification required. Contact support.';
        }
    }

    return { fulfillmentFailed, internalStatus, transMsg };
}
