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

    if (error || !data?.success) {
        console.error('Error fetching order detail:', error || data?.error);
        notFound();
    }

    return <AdminOrderDetailClient order={data.order} />;
}
