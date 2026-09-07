import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { user, admin } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: order, error } = await admin
            .from('ai_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Security check: Merchant can only view if assigned to them or if it is unassigned pending
        if (order.merchant_id && order.merchant_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const formattedOrder = {
            ...order,
            order_code: order.order_code || `AI-${order.id.slice(0, 4).toUpperCase()}`,
            category: order.category || 'Electronics',
            product_image_url: order.product_image_url || '/banners/onboarding-assets.png',
        };

        return NextResponse.json({ order: formattedOrder });
    } catch (error) {
        console.error('Error fetching merchant AI order detail:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
