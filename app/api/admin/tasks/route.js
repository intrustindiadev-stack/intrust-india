import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const ALLOWED_ROLES = ['admin', 'super_admin', 'relationship_manager', 'relationship_exec'];

// GET /api/admin/tasks
// Super admins/Managers: returns all tasks or team tasks
// Admins/Execs: returns their assigned tasks
export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!ALLOWED_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const isSuperAdminOrManager = ['super_admin', 'admin', 'relationship_manager'].includes(profile.role);

        let query = admin
            .from('admin_tasks')
            .select(`
                *,
                assigned_to_profile:user_profiles!admin_tasks_assigned_to_fkey(id, full_name, email, avatar_url),
                assigned_by_profile:user_profiles!admin_tasks_assigned_by_fkey(id, full_name, email)
            `)
            .order('created_at', { ascending: false });

        // Regular users only see their own tasks
        if (!isSuperAdminOrManager) {
            query = query.eq('assigned_to', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ tasks: data || [] });
    } catch (err) {
        console.error('[API] Admin Tasks GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/admin/tasks — managers/admins only
export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['super_admin', 'admin', 'relationship_manager'].includes(profile?.role)) return NextResponse.json({ error: 'Forbidden. Manager/Admin access required.' }, { status: 403 });

        const body = await request.json();
        const { title, description, assigned_to, priority, due_date } = body;

        if (!title || !assigned_to) {
            return NextResponse.json({ error: 'title and assigned_to are required' }, { status: 400 });
        }

        // Verify the assigned user is allowed
        const { data: assignedProfile } = await admin
            .from('user_profiles')
            .select('role, full_name, email')
            .eq('id', assigned_to)
            .single();

        if (!assignedProfile || !ALLOWED_ROLES.includes(assignedProfile.role)) {
            return NextResponse.json({ error: 'assigned_to must be a valid user' }, { status: 400 });
        }

        // Insert the task (service role bypasses RLS)
        const { data: task, error: insertError } = await admin
            .from('admin_tasks')
            .insert({
                title,
                description: description || null,
                assigned_to,
                assigned_by: user.id,
                priority: priority || 'medium',
                status: 'pending',
                due_date: due_date || null,
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
        console.error('[API] Admin Tasks POST Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
