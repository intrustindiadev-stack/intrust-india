import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const { id: orderId } = await params;
        const { user, admin } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the order
        const { data: order, error: orderError } = await admin
            .from('ai_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Security check: cannot initiate on someone else's order
        if (order.merchant_id && order.merchant_id !== user.id) {
            return NextResponse.json({ error: 'This order is assigned to another merchant' }, { status: 403 });
        }

        // Check status
        if (order.status !== 'PENDING' && order.status !== 'PAYMENT_PENDING') {
            return NextResponse.json({ error: 'Order is no longer available for payment' }, { status: 400 });
        }

        // If order already has a sabpaisa_txn_id and is in PAYMENT_PENDING for this user, reuse or generate new
        const sabpaisaTxnId = order.sabpaisa_txn_id || `SP${Date.now()}`;
        
        const { error: updateError } = await admin
            .from('ai_orders')
            .update({ 
                status: 'PAYMENT_PENDING', 
                merchant_id: user.id,
                sabpaisa_txn_id: sabpaisaTxnId,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (updateError) {
            return NextResponse.json({ error: 'Failed to initiate payment lock' }, { status: 409 });
        }

        return NextResponse.json({ 
            success: true, 
            paymentUrl: `/payment/sabpaisa/checkout?txnId=${sabpaisaTxnId}&amount=${order.wholesale_price_paise}&callback=/api/merchant/ai-orders/sabpaisa-webhook`,
            sabpaisaTxnId 
        });

    } catch (error) {
        console.error('Error initiating payment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
