import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import TakeoverClient from './TakeoverClient';

export const dynamic = 'force-dynamic';

export default async function TakeoverOrdersPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch takeover orders via RPC (bypasses RLS)
    const { data, error } = await supabase.rpc('admin_get_takeover_orders');

    if (error) {
        console.error('Error fetching takeover orders:', error);
    }

    const orders = data?.orders || [];

    // Compute stats
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.delivery_status === 'pending').length,
        inProgress: orders.filter(o => ['packed', 'shipped'].includes(o.delivery_status)).length,
        delivered: orders.filter(o => o.delivery_status === 'delivered').length,
        cancelled: orders.filter(o => o.delivery_status === 'cancelled').length,
    };

    return <TakeoverClient orders={orders} stats={stats} />;
}
