import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET /api/crm/notifications — user's notifications (CRM panel)
// PATCH /api/crm/notifications — mark notifications as read
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '30');
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const admin = createAdminClient();

        // 1. Get notifications with pagination
        const { data, error, count } = await admin
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // 2. Get TOTAL unread count (not just for this page)
        const { count: unreadCount, error: countError } = await admin
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

        if (countError) throw countError;

        return NextResponse.json({
            notifications: data || [],
            unreadCount: unreadCount || 0,
            totalCount: count || 0,
            hasMore: (offset + (data?.length || 0)) < (count || 0)
        });
    } catch (error) {
        console.error('[API] CRM Notifications GET Error:', error);
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
        console.error('[API] CRM Notifications PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
