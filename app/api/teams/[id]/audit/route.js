import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function GET(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        const { id: teamId } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Fetch audit logs related to this team
        const { data: logs, error } = await admin
            .from('audit_logs_crm')
            .select(`
                id,
                actor_id,
                action,
                table_name,
                record_id,
                old_data,
                new_data,
                created_at,
                actor:user_profiles!audit_logs_crm_actor_id_fkey(id, full_name, email, role)
            `)
            .or(`record_id.eq.${teamId},new_data->>team_id.eq.${teamId},new_data->>new_team_id.eq.${teamId},old_data->>old_team_id.eq.${teamId}`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({
            team_id: teamId,
            audit_logs: logs || []
        });

    } catch (err) {
        console.error('[API] Team Audit GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
