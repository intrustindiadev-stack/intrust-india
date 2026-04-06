import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import AdminOrderDetailClient from './AdminOrderDetailClient';
import { PLATFORM_CONFIG } from '@/lib/config/platform';

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

    const order = data.order;

    // Fetch seller details — merchant or platform
    let sellerDetails = null;
    if (order.is_platform_order) {
        // Fetch live platform settings from DB, fallback to static config
        try {
            const adminClient = createAdminClient();
            const { data: settings } = await adminClient
                .from('platform_settings')
                .select('key, value');
            if (settings?.length) {
                const db = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
                sellerDetails = {
                    name: db.business_name || PLATFORM_CONFIG.business.name,
                    address: db.business_address || PLATFORM_CONFIG.business.address,
                    phone: db.business_phone || PLATFORM_CONFIG.business.phone,
                    gstin: db.business_gstin || PLATFORM_CONFIG.business.gstin,
                    pan: db.business_pan || PLATFORM_CONFIG.business.pan,
                    website: PLATFORM_CONFIG.business.website,
                };
            } else {
                sellerDetails = PLATFORM_CONFIG.business;
            }
        } catch {
            sellerDetails = PLATFORM_CONFIG.business;
        }
    } else {
        const merchant = order.items?.[0]?.merchants;
        if (merchant) {
            sellerDetails = {
                name: merchant.business_name || "Merchant",
                address: merchant.business_address || "",
                phone: merchant.business_phone || "",
                gstin: merchant.gst_number || "Unregistered",
            };
        }
    }

    return <AdminOrderDetailClient order={order} sellerDetails={sellerDetails} />;
}
