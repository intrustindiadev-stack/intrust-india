import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request, { params }) {
    try {
        const { id } = params;
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { rejection_reason } = body;

        if (!rejection_reason) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        // Verify the order belongs to the merchant and is in a state that can be rejected
        const { data: order, error: orderError } = await supabase
            .from('ai_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.merchant_id !== session.user.id && order.merchant_id !== null) {
            return NextResponse.json({ error: 'Not authorized to reject this order' }, { status: 403 });
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json({ error: 'Only pending orders can be rejected' }, { status: 400 });
        }

        // Update the order status and reason
        const { data: updatedOrder, error: updateError } = await supabase
            .from('ai_orders')
            .update({
                status: 'REJECTED',
                rejection_reason: rejection_reason,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('Error rejecting order:', updateError);
            return NextResponse.json({ error: 'Failed to reject order' }, { status: 500 });
        }

        return NextResponse.json({ success: true, order: updatedOrder });
    } catch (error) {
        console.error('API Error (reject order):', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
