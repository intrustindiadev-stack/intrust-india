import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const TEAM_READ_ROLES = [
    'relationship_exec', 'relationship_manager',
    'admin', 'super_admin', 'hr_manager',
    'employee', 'freelancer', 'video_editor', 'social_media_manager',
    'seo_specialist', 'advertiser', 'support_agent'
];
const TEAM_WRITE_ROLES = ['admin', 'super_admin'];

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!TEAM_READ_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch teams with nested team lead profile & member profiles
        const { data: teams, error } = await admin
            .from('teams')
            .select(`
                *,
                team_lead:user_profiles!teams_team_lead_id_fkey(id, full_name, email, role, avatar_url, phone),
                parent_team:teams!parent_team_id(id, name, region_level),
                members:team_members(
                    id,
                    joined_at,
                    user:user_profiles(id, full_name, email, role, avatar_url, phone)
                )
            `)
            .eq('is_active', true)
            .order('region_level', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;

        // Fetch unassigned sales reps/managers (available for assignment)
        const { data: unassignedUsers, error: userError } = await admin
            .from('user_profiles')
            .select('id, full_name, email, role, avatar_url, phone, team_id')
            .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
            .is('team_id', null)
            .order('full_name', { ascending: true });

        if (userError) console.warn('[API] Failed to fetch unassigned users:', userError.message);

        return NextResponse.json({
            teams: teams || [],
            unassigned_users: unassignedUsers || []
        });
    } catch (err) {
        console.error('[API] Teams GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!TEAM_WRITE_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            region_level = 'area',
            description = null,
            state = 'Madhya Pradesh',
            city = 'Bhopal',
            area = null,
            parent_team_id = null,
            team_lead_id = null,
            color = '#6366f1'
        } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
        }

        // Execute admin_create_team RPC — pass caller id explicitly
        // (service-role key sets auth.uid()=NULL, so we supply it as p_caller_id)
        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_create_team', {
            p_name: name.trim(),
            p_region_level: region_level,
            p_description: description,
            p_state: state,
            p_city: city,
            p_area: area,
            p_parent_team_id: parent_team_id || null,
            p_team_lead_id: team_lead_id || null,
            p_color: color,
            p_caller_id: user.id
        });

        if (rpcErr) throw rpcErr;
        if (!rpcRes?.success) {
            return NextResponse.json({ error: rpcRes?.error || 'Failed to create team' }, { status: 400 });
        }

        // Fetch newly created team details
        const { data: newTeam, error: fetchErr } = await admin
            .from('teams')
            .select(`
                *,
                team_lead:user_profiles!teams_team_lead_id_fkey(id, full_name, email, role, avatar_url, phone),
                members:team_members(
                    id,
                    joined_at,
                    user:user_profiles(id, full_name, email, role, avatar_url, phone)
                )
            `)
            .eq('id', rpcRes.team_id)
            .single();

        if (fetchErr) console.warn('[API] Could not fetch created team:', fetchErr.message);

        return NextResponse.json({
            message: 'Team created successfully',
            team: newTeam || { id: rpcRes.team_id, name }
        }, { status: 201 });
    } catch (err) {
        console.error('[API] Teams POST Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
