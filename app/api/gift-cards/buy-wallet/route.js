import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

        // 1. Fetch coupon details
        const { data: coupon, error: couponError } = await supabaseAdmin
            .from('coupons')
            .select('*')
            .eq('id', couponId)
            .single();

        if (couponError || !coupon) {
            return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
        }

        if (coupon.status !== 'available') {
            return NextResponse.json({ error: 'Gift card is no longer available' }, { status: 400 });
        }

        // Use selling_price_paise (paise) from DB, convert to rupees
        const purchaseAmount = (coupon.selling_price_paise || coupon.face_value_paise || 0) / 100;

        // 2. Fetch User Wallet
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('customer_wallets')
            .select('id, balance_paise')
            .eq('user_id', user.id)
            .single();

        if (walletError || !wallet) {
            return NextResponse.json({ error: 'Wallet not found for this user' }, { status: 404 });
        }

        const purchaseAmountPaise = Math.round(purchaseAmount * 100);

        if (wallet.balance_paise < purchaseAmountPaise) {
            return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
        }

        // 3. Deduct Balance
        const newBalancePaise = wallet.balance_paise - purchaseAmountPaise;
        const { data: updatedWallet, error: deductError } = await supabaseAdmin
            .from('customer_wallets')
            .update({ balance_paise: newBalancePaise })
            .eq('id', wallet.id)
            .eq('balance_paise', wallet.balance_paise) // Optimistic locking
            .select()
            .single();

        if (deductError || !updatedWallet) {
            return NextResponse.json({ error: 'Failed to deduct wallet balance. Balance may have changed concurrently. Please try again.' }, { status: 409 });
        }

        // 4. Mark Coupon as Sold & Assign to User
        const { data: updateData, error: updateCouponError } = await supabaseAdmin
            .from('coupons')
            .update({
                status: 'sold',
                purchased_by: user.id,
                purchased_at: new Date().toISOString()
            })
            .eq('id', couponId)
            .eq('status', 'available') // explicit lock guarantee
            .select('id')
            .single();

        if (updateCouponError || !updateData) {
            console.error(JSON.stringify({ correlationId, stage: 'coupon_update', userId, couponId, error: updateCouponError }));

            // Rollback wallet deduction conceptually
            const { error: rollbackError } = await supabaseAdmin.from('customer_wallets').update({ balance_paise: wallet.balance_paise }).eq('id', wallet.id);
            if (rollbackError) {
                console.error(JSON.stringify({ correlationId, stage: 'wallet_rollback_failed', userId, walletId: wallet.id, error: rollbackError, message: 'CRITICAL: Wallet rollback failed after coupon update error.' }));
                return NextResponse.json({ error: 'Critical failure during recovery. Please contact support.', code: 'ROLLBACK_FAILED', correlationId }, { status: 500 });
            }
            return NextResponse.json({ error: 'This gift card is no longer available' }, { status: 409 });
        }

        // 5. Create an order record so it appears on My Gift Cards page
        const { data: orderData, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                user_id: user.id,
                merchant_id: coupon.merchant_id,
                giftcard_id: couponId,
                amount: purchaseAmountPaise,
                payment_status: 'paid',
                created_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (orderError || !orderData) {
            console.error(JSON.stringify({ correlationId, stage: 'order_insert', userId, couponId, error: orderError }));
            // Rollback the coupon status back to 'available'
            const { error: rollbackCouponError } = await supabaseAdmin.from('coupons').update({
                status: 'available',
                purchased_by: null,
                purchased_at: null
            }).eq('id', couponId);

            if (rollbackCouponError) {
                console.error(JSON.stringify({ correlationId, stage: 'coupon_rollback_failed', userId, couponId, error: rollbackCouponError, message: 'CRITICAL: Coupon rollback failed after order insert error.' }));
                return NextResponse.json({ error: 'Critical failure during recovery (coupon). Please contact support.', code: 'ROLLBACK_FAILED', correlationId }, { status: 500 });
            }

            // Refund the wallet
            const { error: rollbackWalletError } = await supabaseAdmin.from('customer_wallets').update({ balance_paise: wallet.balance_paise }).eq('id', wallet.id);
            if (rollbackWalletError) {
                console.error(JSON.stringify({ correlationId, stage: 'wallet_rollback_failed', userId, walletId: wallet.id, error: rollbackWalletError, message: 'CRITICAL: Wallet rollback failed after order insert error.' }));
                return NextResponse.json({ error: 'Critical failure during recovery (wallet). Please contact support.', code: 'ROLLBACK_FAILED', correlationId }, { status: 500 });
            }
            return NextResponse.json({ error: 'Failed to process order. Purchase reversed successfully.', correlationId }, { status: 500 });
        }

        // 6. Create transaction record for history (using correct wallet transaction table)
        const { error: transactionError } = await supabaseAdmin.from('customer_wallet_transactions').insert({
            wallet_id: wallet.id,
            user_id: user.id,
            type: 'DEBIT',
            amount_paise: purchaseAmountPaise,
            balance_before_paise: wallet.balance_paise,
            balance_after_paise: newBalancePaise,
            description: `Purchased Gift Card: ${coupon.title || 'Gift Card'}`,
            reference_id: couponId,
            reference_type: 'GIFT_CARD_PURCHASE'
        });

        if (transactionError) {
            console.error(JSON.stringify({ correlationId, stage: 'transaction_insert', userId, couponId, error: transactionError }));

            // Rollback Order
            const { error: rollbackOrderError } = await supabaseAdmin.from('orders').delete().eq('id', orderData.id);
            if (rollbackOrderError) {
                console.error(JSON.stringify({ correlationId, stage: 'order_rollback_failed', userId, orderId: orderData.id, error: rollbackOrderError, message: 'CRITICAL: Order rollback failed after transaction insert error.' }));
                return NextResponse.json({ error: 'Critical failure during recovery (order). Please contact support.', code: 'ROLLBACK_FAILED', correlationId }, { status: 500 });
            }

            // Rollback Coupon
            const { error: rollbackCouponError } = await supabaseAdmin.from('coupons').update({
                status: 'available',
                purchased_by: null,
                purchased_at: null
            }).eq('id', couponId);
            if (rollbackCouponError) {
                console.error(JSON.stringify({ correlationId, stage: 'coupon_rollback_failed', userId, couponId, error: rollbackCouponError, message: 'CRITICAL: Coupon rollback failed after transaction insert error.' }));
                return NextResponse.json({ error: 'Critical failure during recovery (coupon). Please contact support.', code: 'ROLLBACK_FAILED', correlationId }, { status: 500 });
            }

            // Rollback Wallet
            const { error: rollbackWalletError } = await supabaseAdmin.from('customer_wallets').update({ balance_paise: wallet.balance_paise }).eq('id', wallet.id);
            if (rollbackWalletError) {
                console.error(JSON.stringify({ correlationId, stage: 'wallet_rollback_failed', userId, walletId: wallet.id, error: rollbackWalletError, message: 'CRITICAL: Wallet rollback failed after transaction insert error.' }));
                return NextResponse.json({ error: 'Critical failure during recovery (wallet). Please contact support.', code: 'ROLLBACK_FAILED', correlationId }, { status: 500 });
            }

            return NextResponse.json({ error: 'Failed to record transaction history. Purchase reversed successfully.', correlationId }, { status: 500 });
        }

        const newBalanceRupees = (newBalancePaise / 100).toFixed(2);
        return NextResponse.json({ success: true, message: 'Gift card purchased successfully', newBalance: newBalanceRupees });

    } catch (error) {
        console.error(JSON.stringify({ correlationId, stage: 'unexpected_error', error: error?.message || String(error), stack: error?.stack, userId, couponId }));
        return NextResponse.json({ error: 'An unexpected internal error occurred.', correlationId }, { status: 500 });
    }
}
