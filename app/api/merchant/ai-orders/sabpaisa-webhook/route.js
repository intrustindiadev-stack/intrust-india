import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// SabPaisa webhook handler for AI order checkout
export async function POST(request) {
    try {
        const body = await request.json();
        const { txnId, status, paymentMethod } = body;

        if (!txnId) {
            return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
        }

        const admin = createAdminClient();

        if (status === 'SUCCESS') {
            const { error: updateError } = await admin
                .from('ai_orders')
                .update({ 
                    status: 'ACCEPTED',
                    payment_method: paymentMethod || 'UPI (PhonePe)',
                    payment_received_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('sabpaisa_txn_id', txnId);

            if (updateError) throw updateError;
            
            return NextResponse.json({ success: true, message: 'Order Accepted and Escrow Locked' });
        } else {
            // If payment failed or cancelled, return order status to PENDING but keep assigned merchant
            const { error: revertError } = await admin
                .from('ai_orders')
                .update({ 
                    status: 'PENDING',
                    updated_at: new Date().toISOString()
                })
                .eq('sabpaisa_txn_id', txnId)
                .eq('status', 'PAYMENT_PENDING');

            if (revertError) throw revertError;

            return NextResponse.json({ success: true, message: 'Payment cancelled, order reverted to PENDING' });
        }
    } catch (error) {
        console.error('Error in AI Orders SabPaisa webhook:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
