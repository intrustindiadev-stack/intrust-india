import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const CRM_ROLES = ['sales_exec', 'sales_manager', 'admin', 'super_admin'];

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!CRM_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const isManager = ['sales_manager', 'admin', 'super_admin'].includes(profile.role);

        let query = admin
            .from('crm_tasks')
            .select(`
                *,
                lead:crm_leads(id, full_name, company),
                assigned_to_profile:user_profiles!crm_tasks_assigned_to_fkey(id, full_name, email, avatar_url)
            `)
            .order('due_date', { ascending: true });

        // Executives only see their own tasks
        if (!isManager) {
            query = query.eq('assigned_to', user.id);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ tasks: data || [] });
    } catch (err) {
        console.error('[API] CRM Tasks GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!CRM_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const isManager = ['sales_manager', 'admin', 'super_admin'].includes(profile.role);

        const body = await request.json();
        let { title, description, assigned_to, due_date, lead_id, status } = body;

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        // Executives can only assign to themselves
        if (!isManager) {
            assigned_to = user.id;
        } else if (!assigned_to) {
            assigned_to = user.id; // default to self if manager didn't specify
        }

        const { data: task, error: insertError } = await admin
            .from('crm_tasks')
            .insert({
                title,
                description: description || null,
                assigned_to,
                lead_id: lead_id || null,
                due_date: due_date || null,
                status: status || 'pending',
            })
            .select(`
                *,
                lead:crm_leads(id, full_name, company),
                assigned_to_profile:user_profiles!crm_tasks_assigned_to_fkey(id, full_name, email, avatar_url)
            `)
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({ task }, { status: 201 });
    } catch (err) {
        console.error('[API] CRM Tasks POST Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
