import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import {
    ALL_TEAM_READ_ROLES,
    getAuthorizedTeamScope,
    teamCreateSchema,
    sanitizeUserProfile,
    formatErrorResponse
} from '@/lib/teamAuth';

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!profile || !ALL_TEAM_READ_ROLES.includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const scope = await getAuthorizedTeamScope(user, profile, admin);
        if (!scope.isAuthorized) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.trim() || '';
        const region_level = searchParams.get('region_level');
        const state = searchParams.get('state');
        const city = searchParams.get('city');
        const area = searchParams.get('area');
        const is_active_param = searchParams.get('is_active');
        const is_active = is_active_param !== null ? is_active_param === 'true' : true;

        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const offset = (page - 1) * limit;

        // Build DB Query for teams
        let query = admin
            .from('teams')
            .select(`
                *,
                team_lead:user_profiles!teams_team_lead_id_fkey(id, full_name, email, role, avatar_url, phone),
                parent_team:teams!parent_team_id(id, name, region_level, state, city),
                members:team_members(
                    id,
                    joined_at,
                    user:user_profiles(id, full_name, email, role, avatar_url, phone, team_id)
                )
            `, { count: 'exact' })
            .eq('is_active', is_active);

        // Server Authorization Scoping
        if (scope.authorizedTeamIds !== null) {
            if (scope.authorizedTeamIds.length === 0) {
                // User has no authorized teams (e.g. executive not in any team)
                const headers = new Headers();
                headers.set('Cache-Control', 'private, no-store');
                return NextResponse.json({
                    teams: [],
                    unassigned_users: [],
                    capabilities: scope.capabilities,
                    pagination: { total: 0, page, limit }
                }, { headers });
            }
            query = query.in('id', scope.authorizedTeamIds);
        }

        // Search & Location filters
        if (search) {
            query = query.ilike('name', `%${search}%`);
        }
        if (region_level) query = query.eq('region_level', region_level);
        if (state) query = query.eq('state', state);
        if (city) query = query.eq('city', city);
        if (area) query = query.eq('area', area);

        query = query.order('region_level', { ascending: true })
            .order('name', { ascending: true })
            .range(offset, offset + limit - 1);

        const { data: rawTeams, error, count } = await query;
        if (error) throw error;

        // Fetch unassigned users ONLY for admins or managers
        let unassignedUsers = [];
        if (scope.capabilities.canAssignMembers) {
            const { data: userList, error: userError } = await admin
                .from('user_profiles')
                .select('id, full_name, email, role, avatar_url, phone, team_id')
                .in('role', ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'])
                .is('team_id', null)
                .order('full_name', { ascending: true })
                .limit(100);

            if (userError) {
                console.warn('[API] Failed to fetch unassigned users:', userError.message);
            } else if (userList) {
                unassignedUsers = userList.map(u => sanitizeUserProfile(u, profile.role));
            }
        }

        // Sanitize teams output according to role privileges
        const sanitizedTeams = (rawTeams || []).map(team => ({
            ...team,
            team_lead: sanitizeUserProfile(team.team_lead, profile.role),
            members: (team.members || []).map(m => ({
                ...m,
                user: sanitizeUserProfile(m.user, profile.role)
            }))
        }));

        const headers = new Headers();
        headers.set('Cache-Control', 'private, no-store');

        return NextResponse.json({
            teams: sanitizedTeams,
            unassigned_users: unassignedUsers,
            capabilities: scope.capabilities,
            pagination: {
                total: count || sanitizedTeams.length,
                page,
                limit
            }
        }, { headers });

    } catch (err) {
        console.error('[API] Teams GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getAuthorizedTeamScope(user, profile, admin);
        if (!scope.capabilities.canCreateTeam) {
            return NextResponse.json({ error: 'Forbidden: Only administrators can create teams' }, { status: 403 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        const parseResult = teamCreateSchema.safeParse(body);
        if (!parseResult.success) {
            const firstErr = parseResult.error.errors[0]?.message || 'Validation failed';
            return NextResponse.json({ error: firstErr, details: parseResult.error.format() }, { status: 400 });
        }

        const data = parseResult.data;
        const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;

        // Execute admin_create_team RPC
        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_create_team', {
            p_name: data.name,
            p_region_level: data.region_level,
            p_description: data.description || null,
            p_state: data.state,
            p_city: data.city || null,
            p_area: data.area || null,
            p_parent_team_id: data.parent_team_id || null,
            p_team_lead_id: data.team_lead_id || null,
            p_color: data.color,
            p_caller_id: user.id,
            p_request_id: requestId
        });

        if (rpcErr) {
            const { response, status } = formatErrorResponse(rpcErr);
            return NextResponse.json(response, { status });
        }

        if (!rpcRes?.success) {
            const { response, status } = formatErrorResponse(rpcRes);
            return NextResponse.json(response, { status });
        }

        // Fetch new team object
        const { data: newTeam } = await admin
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

        return NextResponse.json({
            message: 'Team created successfully',
            team: newTeam || { id: rpcRes.team_id, name: data.name, version: 1 }
        }, { status: 201 });

    } catch (err) {
        console.error('[API] Teams POST Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
