import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { notifyMerchantGiftCardSold } from '@/lib/notifications/merchantWhatsapp';
import { logRewardRpcResult } from '@/lib/rewardRpcResult';

export async function POST(request) {
    const correlationId = crypto.randomUUID();
    let couponId;
    let userId;

    try {
        // Setup admin client to bypass RLS for wallet deductions and coupon updates securely
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid token or user not found' }, { status: 401 });
        }
        userId = user.id;

        // 1. Fetch User Profile to check KYC Status
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .select('kyc_status')
            .eq('id', user.id)
            .single();

        if (profileError || !userProfile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        if (userProfile.kyc_status !== 'verified') {
            return NextResponse.json({ error: 'KYC Verification is required to purchase gift cards. Please complete KYC from your profile.' }, { status: 403 });
        }

        const reqBody = await request.json();
        couponId = reqBody.couponId;

        if (!couponId) {
            return NextResponse.json({ error: 'Missing couponId' }, { status: 400 });
        }

        // 2. Delegate the entire purchase to the atomic RPC.
        // This RPC locks customer_wallets and coupons rows, performs the debit, marks
        // the coupon sold, creates the order, writes the ledger row, and returns the
        // order id and ledger snapshot — all inside a single database transaction so
        // no compensating rollback is ever needed at the application layer.
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'wallet_buy_gift_card',
            {
                p_user_id: user.id,
                p_coupon_id: couponId
            }
        );

        if (rpcError) {
            console.error(JSON.stringify({ correlationId, stage: 'wallet_buy_gift_card_rpc', userId, couponId, error: rpcError }));
            // Translate DB-level guard errors into user-friendly messages
            if (rpcError.message?.includes('Gift card is not available')) {
                return NextResponse.json({ error: 'This gift card is no longer available' }, { status: 409 });
            }
            if (rpcError.message?.includes('Insufficient wallet balance')) {
                return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
            }
            if (rpcError.message?.includes('Wallet not found')) {
                return NextResponse.json({ error: 'Wallet not found for this user' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Failed to process gift card purchase. Please try again.', correlationId }, { status: 500 });
        }

        if (!rpcResult || rpcResult.success === false) {
            const msg = rpcResult?.message || 'Purchase could not be completed';
            console.error(JSON.stringify({ correlationId, stage: 'wallet_buy_gift_card_rpc_failure', userId, couponId, message: msg }));
            return NextResponse.json({ error: msg }, { status: 409 });
        }

        const { order_id: orderId, merchant_id: merchantId, new_balance_paise: newBalancePaise, purchase_amount_paise: purchaseAmountPaise } = rpcResult;
        const purchaseAmountRupees = (purchaseAmountPaise / 100).toFixed(2);

        // 3. Distribute purchase rewards (non-blocking — must not fail the purchase)
        // Uses the same contract as the gateway gift-card path in sabpaisa/callback/route.js:
        //   p_reference_id   = couponId  (the gift card being purchased)
        //   p_reference_type = 'gift_card_purchase'
        try {
            const { data: rewardData, error: rewardError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                p_event_type: 'purchase',
                p_source_user_id: user.id,
                p_reference_id: couponId,
                p_reference_type: 'gift_card_purchase',
                p_amount_paise: purchaseAmountPaise
            });
            if (rewardError) {
                console.error(JSON.stringify({ correlationId, stage: 'reward_rpc_error', userId, couponId, error: rewardError }));
            } else {
                logRewardRpcResult({
                    event_type: 'purchase',
                    source_user_id: user.id,
                    reference_id: couponId,
                    reference_type: 'gift_card_purchase',
                }, rewardData);
            }
        } catch (rewardErr) {
            console.error(JSON.stringify({ correlationId, stage: 'reward_distribution_error', userId, couponId, error: rewardErr?.message }));
        }

        // 4. Send Notifications (non-blocking)
        try {
            // Customer Notification
            await supabaseAdmin.from('notifications').insert({
                user_id: user.id,
                title: 'Gift Card Purchased ✅',
                body: `You successfully purchased a gift card worth ₹${purchaseAmountRupees}.`,
                type: 'success',
                reference_id: orderId,
                reference_type: 'gift_card_purchase'
            });

            // Merchant Notification
            if (merchantId) {
                const { data: merchantDetails } = await supabaseAdmin
                    .from('merchants')
                    .select('user_id')
                    .eq('id', merchantId)
                    .single();

                if (merchantDetails?.user_id) {
                    await supabaseAdmin.from('notifications').insert({
                        user_id: merchantDetails.user_id,
                        title: 'Gift Card Sold 💳',
                        body: `A customer purchased a gift card worth ₹${purchaseAmountRupees}.`,
                        type: 'success',
                        reference_id: orderId,
                        reference_type: 'gift_card_purchase'
                    });

                    // WhatsApp Notification (fire-and-forget)
                    notifyMerchantGiftCardSold({
                        merchantUserId: merchantDetails.user_id,
                        amountRs: purchaseAmountRupees,
                        brand: rpcResult.coupon_title || 'Gift Card'
                    });
                }
            }
        } catch (notificationError) {
            console.error('[Buy-Wallet] Gift card notifications failed:', notificationError.message);
        }

        const newBalanceRupees = (newBalancePaise / 100).toFixed(2);
        return NextResponse.json({ success: true, message: 'Gift card purchased successfully', newBalance: newBalanceRupees });

    } catch (error) {
        console.error(JSON.stringify({ correlationId, stage: 'unexpected_error', error: error?.message || String(error), stack: error?.stack, userId, couponId }));
        return NextResponse.json({ error: 'An unexpected internal error occurred.', correlationId }, { status: 500 });
    }
}
