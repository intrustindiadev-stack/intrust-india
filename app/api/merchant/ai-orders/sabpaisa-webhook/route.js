import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Mock Sabpaisa webhook for accepting payment
export async function POST(request) {
    try {
        const body = await request.json();
        const { txnId, status } = body;

        if (!txnId) {
            return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 });
        }

        // We use service role to update order bypassing RLS on webhooks
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (status === 'SUCCESS') {
            const { error: updateError } = await supabase
                .from('ai_orders')
                .update({ 
                    status: 'ACCEPTED',
                    updated_at: new Date().toISOString()
                })
                .eq('sabpaisa_txn_id', txnId)
                .eq('status', 'PAYMENT_PENDING');

            if (updateError) throw updateError;
            
            return NextResponse.json({ success: true, message: 'Order Accepted' });
        } else {
            // Revert to pending
            const { error: revertError } = await supabase
                .from('ai_orders')
                .update({ 
                    status: 'PENDING',
                    merchant_id: null,
                    sabpaisa_txn_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('sabpaisa_txn_id', txnId);

            if (revertError) throw revertError;

            return NextResponse.json({ success: true, message: 'Payment failed, order reverted' });
        }
    } catch (error) {
        console.error('Error in webhook:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
