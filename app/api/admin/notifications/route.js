import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

// GET /api/admin/notifications
export async function GET(request) {
    try {
        const { user, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

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
        console.error('[API] Admin Notifications GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/admin/notifications — mark as read
export async function PATCH(request) {
    try {
        const { user, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

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
        console.error('[API] Admin Notifications PATCH Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
