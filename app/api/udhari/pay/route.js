import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { notifyMerchantStoreCreditPaid } from '@/lib/notifications/merchantWhatsapp';

export async function POST(request) {
    const correlationId = crypto.randomUUID();
    let userId;

    try {
        const supabaseAdmin = createAdminClient();

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
        const feeBps = settings?.convenience_fee_bps ?? 300;
        const extraFeePaise = Math.round(purchaseAmountPaise * feeBps / 10000);
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
                error: `Insufficient wallet balance. You need ₹${needed} more.${extraFeePaise > 0 ? ` (includes ₹${(extraFeePaise / 100).toFixed(2)} merchant fee)` : ''}`
            }, { status: 400 });
        }

        // 5-9. Atomically deduct wallet, mark coupon sold, insert order, ledgers, and udhari complete
        const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
            'settle_udhari_payment',
            {
                p_udhari_request_id: requestId,
                p_customer_user_id: user.id,
                p_extra_fee_paise: extraFeePaise,
                p_customer_email: user.email || null,
            }
        );

        if (rpcError) {
            console.error(JSON.stringify({ correlationId, stage: 'settle_rpc_error', error: rpcError, code: rpcError.code, message: rpcError.message }));

            if (rpcError.message.includes('udhari_not_found') || rpcError.message.includes('wallet_not_found')) {
                return NextResponse.json({ error: 'Udhari request or wallet not found.' }, { status: 404 });
            }
            if (rpcError.message.includes('insufficient_balance')) {
                const parts = rpcError.message.split(':');
                const currentBalance = parts.length > 1 ? parseInt(parts[1], 10) : wallet.balance_paise;
                const needed = ((totalAmountPaise - currentBalance) / 100).toFixed(2);
                return NextResponse.json({
                    error: `Insufficient wallet balance. You need ₹${needed} more.${extraFeePaise > 0 ? ` (includes ₹${(extraFeePaise / 100).toFixed(2)} merchant fee)` : ''}`
                }, { status: 400 });
            }
            if (rpcError.message.includes('coupon_not_reserved')) {
                return NextResponse.json({ error: 'Failed to finalize gift card purchase. It may no longer be available.' }, { status: 409 });
            }

            return NextResponse.json({ error: 'Failed to process payment. Please try again.', correlationId }, { status: 500 });
        }

        const newBalancePaise = rpcResult.new_balance_paise;

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

            // Best-effort WhatsApp notification (Fire-and-forget)
            try {
                notifyMerchantStoreCreditPaid({
                    merchantUserId: merchantData.user_id,
                    amountRs: (totalAmountPaise / 100).toFixed(2),
                    item: udhariRequest.coupon?.title || udhariRequest.coupon?.brand || 'Gift Card'
                });
            } catch (e) {
                console.error('[Udhari Pay] WhatsApp dispatch failed:', e);
            }
        }

        // 10.1 ADDED: Notify Customer
        await supabaseAdmin.from('notifications').insert([{
            user_id: userId,
            title: 'Store Credit Payment Successful ✅',
            body: `Your payment of ₹${(totalAmountPaise / 100).toFixed(2)} for ${udhariRequest.coupon?.title || 'Gift Card'} has been settled. Check your Gift Cards.`,
            type: 'success',
            reference_id: requestId,
            reference_type: 'udhari_completed'
        }]);

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
