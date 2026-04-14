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

        if (rpcErr || !data?.success) {
            return NextResponse.json({ error: rpcErr?.message || data?.message || 'Failed to takeover' }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Order manually taken over' });
    } catch (error) {
        console.error('[Manual Takeover Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
