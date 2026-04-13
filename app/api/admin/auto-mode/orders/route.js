import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/admin/auto-mode/orders?merchantIds=id1,id2
// Uses service role key to bypass RLS on shopping_order_groups
export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        // Verify caller is an admin
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Get merchant IDs from query param
        const { searchParams } = new URL(request.url);
        const merchantIdsParam = searchParams.get('merchantIds');
        if (!merchantIdsParam) {
            return NextResponse.json({ orders: [] });
        }

        const merchantIds = merchantIdsParam.split(',').filter(Boolean);
        if (merchantIds.length === 0) {
            return NextResponse.json({ orders: [] });
        }

        // Fetch orders using service role (bypasses RLS)
        const { data: orders, error } = await admin
            .from('shopping_order_groups')
            .select('id, merchant_id, created_at, delivery_status, payment_method, total_amount_paise, customer_name, customer_phone, delivery_address')
            .in('merchant_id', merchantIds)
            .order('created_at', { ascending: false })
            .limit(300);

        if (error) throw error;

        return NextResponse.json({
            orders: (orders || []).map(o => ({
                ...o,
                payment_status: o.payment_method ? 'paid' : 'pending',
            }))
        });

    } catch (err) {
        console.error('[API] Admin Auto-Mode Orders GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
