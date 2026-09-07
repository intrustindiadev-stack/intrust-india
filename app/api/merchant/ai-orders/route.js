import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { user, admin } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch orders specifically assigned to this merchant OR open unassigned pending orders
        const { data, error } = await admin
            .from('ai_orders')
            .select('*')
            .or(`merchant_id.eq.${user.id},and(merchant_id.is.null,status.eq.PENDING)`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formattedOrders = (data || []).map((order, idx) => ({
            ...order,
            order_code: order.order_code || `AI${String(data.length - idx).padStart(3, '0')}`,
            category: order.category || 'Electronics',
            product_image_url: order.product_image_url || '/banners/onboarding-assets.png',
        }));

        // Counts for merchant tabs
        const total = formattedOrders.length;
        const pending = formattedOrders.filter(o => o.status === 'PENDING').length;
        const paymentPending = formattedOrders.filter(o => o.status === 'PAYMENT_PENDING').length;
        const inProgress = formattedOrders.filter(o => o.status === 'ACCEPTED').length;
        const completed = formattedOrders.filter(o => o.status === 'COMPLETED').length;

        return NextResponse.json({ 
            orders: formattedOrders,
            counts: {
                total,
                pending,
                paymentPending,
                inProgress,
                completed
            }
        });
    } catch (error) {
        console.error('Error fetching AI orders for merchant:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
