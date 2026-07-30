import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const TEAM_WRITE_ROLES = ['admin', 'super_admin'];

export async function PATCH(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        const { id: teamId } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!TEAM_WRITE_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            description,
            region_level,
            state,
            city,
            area,
            parent_team_id,
            team_lead_id,
            color,
            is_active
        } = body;

        const updates = { updated_at: new Date().toISOString() };
        if (name !== undefined) updates.name = name.trim();
        if (description !== undefined) updates.description = description;
        if (region_level !== undefined) updates.region_level = region_level;
        if (state !== undefined) updates.state = state;
        if (city !== undefined) updates.city = city;
        if (area !== undefined) updates.area = area;
        if (parent_team_id !== undefined) updates.parent_team_id = parent_team_id || null;
        if (color !== undefined) updates.color = color;
        if (is_active !== undefined) updates.is_active = is_active;

        // If team_lead_id changed
        if (team_lead_id !== undefined) {
            updates.team_lead_id = team_lead_id || null;

            // Ensure new lead is added to team members
            if (team_lead_id) {
                await admin.rpc('admin_add_team_member', {
                    p_team_id: teamId,
                    p_user_id: team_lead_id,
                    p_caller_id: user.id
                });
            }
        }

        const { data: updatedTeam, error } = await admin
            .from('teams')
            .update(updates)
            .eq('id', teamId)
            .select(`
                *,
                team_lead:user_profiles!teams_team_lead_id_fkey(id, full_name, email, role, avatar_url, phone),
                members:team_members(
                    id,
                    joined_at,
                    user:user_profiles(id, full_name, email, role, avatar_url, phone)
                )
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({ message: 'Team updated successfully', team: updatedTeam });
    } catch (err) {
        console.error('[API] Teams PATCH Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        const { id: teamId } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!TEAM_WRITE_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Soft-delete team by marking is_active = false
        const { error } = await admin
            .from('teams')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', teamId);

        if (error) throw error;

        // Remove team_id reference from user_profiles
        await admin
            .from('user_profiles')
            .update({ team_id: null })
            .eq('team_id', teamId);

        return NextResponse.json({ message: 'Team deleted successfully' });
    } catch (err) {
        console.error('[API] Teams DELETE Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
