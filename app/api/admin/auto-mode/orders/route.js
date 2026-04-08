import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET /api/admin/auto-mode/orders?merchantIds=id1,id2
// Uses service role key to bypass RLS on shopping_order_groups
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        const admin = createAdminClient();

        // Verify caller is an admin
        let user = null;
        if (token) {
            const { data: { user: tokenUser }, error } = await admin.auth.getUser(token);
            if (!error) user = tokenUser;
        }
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

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
