import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import AdminOrderDetailClient from './AdminOrderDetailClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({ params }) {
    const { orderId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data, error } = await supabase.rpc('admin_get_order_detail', {
        p_order_id: orderId
    });

    if (error) {
        console.error('RPC Error fetching order detail:', error);
        throw new Error('Failed to fetch order details from database.');
    }

    if (!data?.success) {
        if (data?.message === 'Order not found') {
            console.warn('Order not found:', orderId);
            notFound();
        } else {
            console.error('Logic error fetching order detail:', data?.message);
            throw new Error(data?.message || 'Failed to fetch order details.');
        }
    }

    return <AdminOrderDetailClient order={data.order} />;
}
