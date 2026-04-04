import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const ADMIN_ROLES = ['admin', 'super_admin'];

// GET /api/admin/tasks/[id]
export async function GET(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        const { id } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!ADMIN_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { data: task, error } = await admin
            .from('admin_tasks')
            .select(`
                *,
                assigned_to_profile:user_profiles!admin_tasks_assigned_to_fkey(id, full_name, email, avatar_url),
                assigned_by_profile:user_profiles!admin_tasks_assigned_by_fkey(id, full_name, email)
            `)
            .eq('id', id)
            .single();

        if (error) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        // Admins can only view their own tasks
        if (profile.role === 'admin' && task.assigned_to !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ task });
    } catch (err) {
        console.error('[API] Admin Task GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/admin/tasks/[id]
// Super admin: can update all fields
// Admin: can only update status on their own tasks
export async function PATCH(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        const { id } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!ADMIN_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const isSuperAdmin = profile.role === 'super_admin';

        // Fetch the existing task
        const { data: existingTask, error: fetchError } = await admin
            .from('admin_tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

        // Admins can only update status on their own tasks
        if (!isSuperAdmin) {
            if (existingTask.assigned_to !== user.id) {
                return NextResponse.json({ error: 'Forbidden. You can only update your own tasks.' }, { status: 403 });
            }
            // Only allow status updates for non-super-admins
            const allowedFields = ['status'];
            const updateData = {};
            for (const key of allowedFields) {
                if (key in body) updateData[key] = body[key];
            }
            if (Object.keys(updateData).length === 0) {
                return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 });
            }

            const { data: task, error } = await admin
                .from('admin_tasks')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ task });
        }

        // Super admin: can update all fields
        const { title, description, assigned_to, priority, status, due_date } = body;
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;
        if (due_date !== undefined) updateData.due_date = due_date;

        const { data: task, error } = await admin
            .from('admin_tasks')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ task });
    } catch (err) {
        console.error('[API] Admin Task PATCH Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/admin/tasks/[id] — super_admin only
export async function DELETE(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        const { id } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden. Super Admin access required.' }, { status: 403 });

        const { error } = await admin.from('admin_tasks').delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[API] Admin Task DELETE Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
