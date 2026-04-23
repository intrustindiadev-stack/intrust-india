import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { user, profile, admin: supabase } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

        if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { order_id } = body;

        if (!order_id) {
            return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
        }

        const { data, error: rpcErr } = await supabase.rpc('admin_takeover_single_order', {
            p_order_id: order_id,
            p_admin_id: user.id
        });

        if (rpcErr) {
            if (rpcErr.code === '23514') {
                return NextResponse.json({ error: 'Data constraint violation. Check inventory or payment rules.' }, { status: 400 });
            }
            if (rpcErr.code === '23502') {
                return NextResponse.json({ error: 'Missing required field in order structure.' }, { status: 400 });
            }
            if (rpcErr.code === '23503') {
                return NextResponse.json({ error: 'Foreign key violation. Linked record missing.' }, { status: 400 });
            }
            return NextResponse.json({ error: rpcErr.message || 'Failed to takeover' }, { status: 400 });
        }

        if (!data?.success) {
            return NextResponse.json({ error: data?.message || 'Failed to takeover' }, { status: 400 });
        }

        // 2.1 ADDED: Notify Merchant and Customer
        try {
            const { data: order } = await supabase
                .from('shopping_order_groups')
                .select('merchant_id, customer_id')
                .eq('id', order_id)
                .single();

            if (order) {
                // 1. Notify Merchant (their order was taken over)
                const { data: mData } = await supabase.from('merchants').select('user_id').eq('id', order.merchant_id).single();
                if (mData) {
                    await supabase.from('notifications').insert([{
                        user_id: mData.user_id,
                        title: 'Order Taken Over by Admin ⚠️',
                        body: `Order #${order_id.slice(0, 8).toUpperCase()} has been manually taken over by an admin for fulfillment.`,
                        type: 'warning',
                        reference_type: 'shopping_order',
                        reference_id: order_id
                    }]);
                }

                // 2. Notify Customer (fulfillment is handled by platform)
                await supabase.from('notifications').insert([{
                    user_id: order.customer_id,
                    title: 'Order Status Update 🛍️',
                    body: `Your order #${order_id.slice(0, 8).toUpperCase()} is now being fulfilled directly by the platform.`,
                    type: 'info',
                    reference_type: 'shopping_order',
                    reference_id: order_id
                }]);
            }
        } catch (err) {
            console.error('[Takeover Notif Error]:', err);
        }

        return NextResponse.json({ success: true, message: 'Order manually taken over' });
    } catch (error) {
        console.error('[Manual Takeover Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
