import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminOrdersClient from './AdminOrdersClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch all orders via RPC (bypasses RLS)
    const { data, error } = await supabase.rpc('admin_get_all_orders', {
        p_limit: 200,
        p_offset: 0
    });

    if (error) {
        console.error('Error fetching orders:', error);
    }

    const orders = data?.orders || [];

    // Compute stats
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.delivery_status === 'pending').length,
        inProgress: orders.filter(o => ['packed', 'shipped'].includes(o.delivery_status)).length,
        delivered: orders.filter(o => o.delivery_status === 'delivered').length,
        cancelled: orders.filter(o => o.delivery_status === 'cancelled').length,
        totalRevenue: orders.reduce((sum, o) => sum + (o.total_amount_paise || 0), 0),
        platformOrders: orders.filter(o => o.is_platform_order).length,
        merchantOrders: orders.filter(o => !o.is_platform_order).length,
    };

    return <AdminOrdersClient orders={orders} stats={stats} />;
}
