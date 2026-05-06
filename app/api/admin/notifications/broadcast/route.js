import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/notifications/broadcast
 * Allows admins to send notifications to users.
 * Body: {
 *   target: 'all' | 'merchants' | 'customers' | 'hrm' | 'crm' | 'employee' | 'user_id',
 *   userId?: string, (if target is 'user_id')
 *   title: string,
 *   body: string,
 *   type: 'info' | 'success' | 'warning' | 'error',
 *   reference_type?: string,
 *   reference_id?: string
 * }
 */
export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', adminUser.id)
            .single();

        if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { target, userId, title, body: content, type, reference_type, reference_id } = body;

        if (!target || !title || !content || !type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const admin = createAdminClient();
        let targetUserIds = [];

        if (target === 'user_id') {
            if (!userId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
            targetUserIds = [userId];
        } else if (target === 'all') {
            const { data } = await admin.from('user_profiles').select('id');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'merchants') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'merchant');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'customers') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'customer');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'hrm') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'hrm');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'crm') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'crm');
            targetUserIds = data.map(p => p.id);
        } else if (target === 'employee') {
            const { data } = await admin.from('user_profiles').select('id').eq('role', 'employee');
            targetUserIds = data.map(p => p.id);
        }

        if (targetUserIds.length === 0) {
            return NextResponse.json({ error: 'No users found for target' }, { status: 404 });
        }

        // Insert notifications in batches to avoid payload limits
        const notifications = targetUserIds.map(uid => ({
            user_id: uid,
            title,
            body: content,
            type,
            reference_type,
            reference_id,
            read: false
        }));

        // Batch size of 100
        const batchSize = 100;
        for (let i = 0; i < notifications.length; i += batchSize) {
            const batch = notifications.slice(i, i + batchSize);
            const { error: insertError } = await admin.from('notifications').insert(batch);
            if (insertError) throw insertError;
        }

        return NextResponse.json({ success: true, count: targetUserIds.length });
    } catch (error) {
        console.error('[API] Admin Broadcast Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
