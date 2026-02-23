import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET /api/merchant/notifications — merchant's notifications
// PATCH /api/merchant/notifications — mark notifications as read
export async function GET() {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const admin = createAdminClient();
        const { data, error } = await admin
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) throw error;
        const unreadCount = (data || []).filter(n => !n.read).length;
        return NextResponse.json({ notifications: data || [], unreadCount });
    } catch (error) {
        console.error('[API] Notifications GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        // body.id = specific notification id OR body.all = true for mark all read
        const admin = createAdminClient();

        if (body.all) {
            await admin
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);
        } else if (body.id) {
            await admin
                .from('notifications')
                .update({ read: true })
                .eq('id', body.id)
                .eq('user_id', user.id);
        } else {
            return NextResponse.json({ error: 'Provide id or all=true' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Notifications PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
