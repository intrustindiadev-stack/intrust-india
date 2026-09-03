import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const { id: orderId } = params;
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the order
        const { data: order, error: orderError } = await supabase
            .from('ai_orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json({ error: 'Order is no longer available' }, { status: 400 });
        }

        // Mark as PAYMENT_PENDING and assign to merchant temporarily
        // Sabpaisa transaction simulation
        const sabpaisaTxnId = `TXN_AI_${Date.now()}_${user.id.substring(0, 8)}`;
        
        const { error: updateError } = await supabase
            .from('ai_orders')
            .update({ 
                status: 'PAYMENT_PENDING', 
                merchant_id: user.id,
                sabpaisa_txn_id: sabpaisaTxnId,
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('status', 'PENDING'); // Optimistic concurrency check

        if (updateError) {
            return NextResponse.json({ error: 'Failed to initiate payment or order already taken' }, { status: 409 });
        }

        // Return mock Sabpaisa payment details
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
