import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { rejection_reason } = body;

        if (!rejection_reason || !rejection_reason.trim()) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
        }

        // Verify the order exists
        const { data: order, error: orderError } = await supabaseAdmin
            .from('ai_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Allow rejecting if order is assigned to this merchant or is unassigned (merchant_id is null)
        if (order.merchant_id && order.merchant_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized to reject this order' }, { status: 403 });
        }

        if (order.status !== 'PENDING') {
            return NextResponse.json({ error: 'Only pending orders can be rejected' }, { status: 400 });
        }

        // Update the order status and reason
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
            .from('ai_orders')
            .update({
                status: 'REJECTED',
                rejection_reason: rejection_reason.trim(),
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
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

