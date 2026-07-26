import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const CRM_ROLES = ['sales_exec', 'sales_manager', 'admin', 'super_admin'];

export async function PATCH(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!CRM_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const isManager = ['sales_manager', 'admin', 'super_admin'].includes(profile.role);
        const { id } = params;

        // Verify task ownership/access
        const { data: existingTask } = await admin
            .from('crm_tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        
        // Executives can only edit their own assigned tasks
        if (!isManager && existingTask.assigned_to !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        
        // Prevent executives from reassigning tasks
        if (!isManager && body.assigned_to && body.assigned_to !== user.id) {
             delete body.assigned_to;
        }

        const { data: task, error: updateError } = await admin
            .from('crm_tasks')
            .update({
                ...body,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select(`
                *,
                lead:crm_leads(id, full_name, company),
                assigned_to_profile:user_profiles!crm_tasks_assigned_to_fkey(id, full_name, email, avatar_url)
            `)
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ task });
    } catch (err) {
        console.error('[API] CRM Tasks PATCH Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!CRM_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const isManager = ['sales_manager', 'admin', 'super_admin'].includes(profile.role);
        const { id } = params;

        // Verify task ownership/access
        const { data: existingTask } = await admin
            .from('crm_tasks')
            .select('*')
            .eq('id', id)
            .single();

        if (!existingTask) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        
        // Executives can only delete their own assigned tasks
        if (!isManager && existingTask.assigned_to !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error: deleteError } = await admin
            .from('crm_tasks')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[API] CRM Tasks DELETE Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
