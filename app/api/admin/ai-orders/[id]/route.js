import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin } = await getAuthUser(request);
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch order
        const { data: order, error } = await admin
            .from('ai_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Fetch merchant details
        let merchantData = null;
        let merchantProfile = null;

        if (order.merchant_id) {
            const { data: mData } = await admin
                .from('merchants')
                .select('id, user_id, business_name, business_phone, business_email, status, created_at')
                .eq('user_id', order.merchant_id)
                .maybeSingle();

            merchantData = mData;

            const { data: pData } = await admin
                .from('user_profiles')
                .select('id, full_name, phone, email, avatar_url')
                .eq('id', order.merchant_id)
                .maybeSingle();

            merchantProfile = pData;
        }

        const enrichedOrder = {
            ...order,
            order_code: order.order_code || `AI-${order.id.slice(0, 4).toUpperCase()}`,
            category: order.category || 'Electronics',
            product_image_url: order.product_image_url || '/banners/onboarding-assets.png',
            merchant: {
                user_id: order.merchant_id,
                business_name: merchantData?.business_name || merchantProfile?.full_name || 'Assigned Merchant',
                contact_name: merchantProfile?.full_name || 'Merchant Owner',
                phone: merchantData?.business_phone || merchantProfile?.phone || '—',
                email: merchantData?.business_email || merchantProfile?.email || '—',
                avatar_url: merchantProfile?.avatar_url || null,
                status: merchantData?.status || 'approved'
            }
        };

        return NextResponse.json({ order: enrichedOrder });
    } catch (error) {
        console.error('Error fetching admin AI order detail:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
