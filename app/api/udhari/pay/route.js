import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const correlationId = crypto.randomUUID();
    let userId;

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Auth check
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

        const { requestId } = await request.json();
        if (!requestId) {
            return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
        }

        // 2. Fetch udhari request
        const { data: udhariRequest, error: fetchError } = await supabaseAdmin
            .from('udhari_requests')
            .select('*, coupon:coupons(id, title, brand, selling_price_paise, face_value_paise, status, merchant_id)')
            .eq('id', requestId)
            .eq('customer_id', user.id)
            .single();

        if (fetchError || !udhariRequest) {
            return NextResponse.json({ error: 'Deferred payment request not found' }, { status: 404 });
        }

        if (udhariRequest.status !== 'approved') {
            return NextResponse.json({ error: `This request is "${udhariRequest.status}" and cannot be paid.` }, { status: 400 });
        }

        // 3. Optional: Verify merchant settings (left as skeleton to ensure extra validations if needed later)
        const { data: settings } = await supabaseAdmin
            .from('merchant_udhari_settings')
            .select('*')
            .eq('merchant_id', udhariRequest.merchant_id)
            .single();

        const purchaseAmountPaise = udhariRequest.amount_paise;
        const extraFeePaise = Math.round(purchaseAmountPaise * 0.03); // Fixed 3% platform convenience fee
        const totalAmountPaise = purchaseAmountPaise + extraFeePaise;

        // 4. Fetch wallet
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('customer_wallets')
            .select('id, balance_paise')
            .eq('user_id', user.id)
            .single();

        if (walletError || !wallet) {
            return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
        }

        if (wallet.balance_paise < totalAmountPaise) {
            const needed = ((totalAmountPaise - wallet.balance_paise) / 100).toFixed(2);
            return NextResponse.json({
                error: `Insufficient wallet balance. You need ₹${needed} more.${extraFeePaise > 0 ? ` (includes ₹${(extraFeePaise / 100).toFixed(2)} service fee)` : ''}`
            }, { status: 400 });
        }

        // 5. Deduct wallet (optimistic lock)
        const newBalancePaise = wallet.balance_paise - totalAmountPaise;
        const { data: updatedWallet, error: deductError } = await supabaseAdmin
            .from('customer_wallets')
            .update({ balance_paise: newBalancePaise })
            .eq('id', wallet.id)
            .eq('balance_paise', wallet.balance_paise)
            .select()
            .single();

        if (deductError || !updatedWallet) {
            return NextResponse.json({ error: 'Failed to deduct wallet balance. Please try again.' }, { status: 409 });
        }

        // 6. Mark coupon as sold
        const { data: updateData, error: couponUpdateError } = await supabaseAdmin
            .from('coupons')
            .update({
                status: 'sold',
                purchased_by: user.id,
                purchased_at: new Date().toISOString(),
            })
            .eq('id', udhariRequest.coupon_id)
            .eq('status', 'reserved')
            .select('id')
            .single();

        if (couponUpdateError || !updateData) {
            console.error(JSON.stringify({ correlationId, stage: 'coupon_sold', error: couponUpdateError }));
            // Rollback wallet
            await supabaseAdmin.from('customer_wallets').update({ balance_paise: wallet.balance_paise }).eq('id', wallet.id);
            return NextResponse.json({ error: 'Failed to finalize gift card purchase. Wallet refunded.' }, { status: 500 });
        }

        // 7. Create order record
        const { data: orderData, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                user_id: user.id,
                giftcard_id: udhariRequest.coupon_id,
                amount: totalAmountPaise,
                payment_status: 'paid',
                created_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (orderError || !orderData) {
            console.error(JSON.stringify({ correlationId, stage: 'order_insert', error: orderError }));
            // Rollback coupon + wallet
            await supabaseAdmin.from('coupons').update({ status: 'reserved', purchased_by: null, purchased_at: null }).eq('id', udhariRequest.coupon_id);
            await supabaseAdmin.from('customer_wallets').update({ balance_paise: wallet.balance_paise }).eq('id', wallet.id);
            return NextResponse.json({ error: 'Failed to create order. Purchase reversed.' }, { status: 500 });
        }

        // 8. Create wallet transaction (Customer Ledger)
        const { error: txnError } = await supabaseAdmin.from('customer_wallet_transactions').insert({
            wallet_id: wallet.id,
            user_id: user.id,
            type: 'DEBIT',
            amount_paise: totalAmountPaise,
            balance_before_paise: wallet.balance_paise,
            balance_after_paise: newBalancePaise,
            description: `Udhari Settlement: ${udhariRequest.coupon?.brand || 'Gift Card'} - ${udhariRequest.coupon?.title || ''}${extraFeePaise > 0 ? ` (incl. ₹${(extraFeePaise / 100).toFixed(2)} fee)` : ''}`,
            reference_id: udhariRequest.id,
            reference_type: 'UDHARI_PAYMENT',
        });

        if (txnError) {
            console.error(JSON.stringify({ correlationId, stage: 'txn_insert', error: txnError }));
            // Non-critical at this stage — payment is already done
        }

        // 9. Mark udhari as completed
        await supabaseAdmin
            .from('udhari_requests')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        // 9b. Log transaction for Merchant Ledger
        // We log the principal amount as the merchant's sale (convenience fee is platform revenue)
        const { error: merchantTxError } = await supabaseAdmin.from('merchant_transactions').insert({
            merchant_id: udhariRequest.merchant_id,
            transaction_type: 'udhari_payment',
            amount_paise: purchaseAmountPaise,
            commission_paise: 0, // Commission usually handled at merchant_purchase_price or separately
            description: `Udhari Paid: ${udhariRequest.coupon?.title || 'Gift Card'} (Cust: ${user.email})`,
            metadata: { 
                udhari_request_id: requestId, 
                customer_id: user.id,
                coupon_id: udhariRequest.coupon_id 
            }
        });

        if (merchantTxError) {
            console.error(JSON.stringify({ correlationId, stage: 'merchant_txn_insert', error: merchantTxError }));
        }

        // 10. Notify merchant
        const { data: merchantData } = await supabaseAdmin
            .from('merchants')
            .select('user_id')
            .eq('id', udhariRequest.merchant_id)
            .single();

        if (merchantData) {
            await supabaseAdmin.from('notifications').insert({
                user_id: merchantData.user_id,
                title: 'Store Credit Payment Received ✅',
                body: `Payment of ₹${(totalAmountPaise / 100).toFixed(2)} received for "${udhariRequest.coupon?.title || 'Gift Card'}".`,
                type: 'success',
                reference_id: requestId,
                reference_type: 'udhari_completed',
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Payment successful! Gift card is now yours.',
            newBalance: (newBalancePaise / 100).toFixed(2),
        });

    } catch (error) {
        console.error(JSON.stringify({ correlationId, stage: 'unexpected_error', error: error?.message || String(error), userId }));
        return NextResponse.json({ error: 'An unexpected internal error occurred.', correlationId }, { status: 500 });
    }
}
