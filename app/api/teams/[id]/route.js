import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import {
    getAuthorizedTeamScope,
    teamUpdateSchema,
    teamDeactivateSchema,
    formatErrorResponse
} from '@/lib/teamAuth';

export async function PATCH(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        const { id: teamId } = await params;

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getAuthorizedTeamScope(user, profile, admin);
        if (!scope.capabilities.canEditTeam) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        const parseResult = teamUpdateSchema.safeParse(body);
        if (!parseResult.success) {
            const firstErr = parseResult.error.errors[0]?.message || 'Validation failed';
            return NextResponse.json({ error: firstErr, details: parseResult.error.format() }, { status: 400 });
        }

        const data = parseResult.data;
        const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;

        // Call admin_update_team RPC
        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_update_team', {
            p_team_id: teamId,
            p_expected_version: data.expected_version || null,
            p_name: data.name || null,
            p_description: data.description !== undefined ? data.description : null,
            p_region_level: data.region_level || null,
            p_state: data.state || null,
            p_city: data.city !== undefined ? data.city : null,
            p_area: data.area !== undefined ? data.area : null,
            p_parent_team_id: data.parent_team_id !== undefined ? data.parent_team_id : null,
            p_team_lead_id: data.team_lead_id !== undefined ? data.team_lead_id : null,
            p_color: data.color || null,
            p_retain_old_lead: data.retain_old_lead ?? true,
            p_caller_id: user.id,
            p_reason: data.reason || null,
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

        // Fetch updated team object
        const { data: updatedTeam } = await admin
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
            .eq('id', teamId)
            .single();

        return NextResponse.json({
            message: 'Team updated successfully',
            team: updatedTeam || { id: teamId, version: rpcRes.version }
        });

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

        const scope = await getAuthorizedTeamScope(user, profile, admin);
        if (!scope.capabilities.canDeactivateTeam) {
            return NextResponse.json({ error: 'Forbidden: Only administrators can deactivate teams' }, { status: 403 });
        }

        let body = {};
        try {
            body = await request.json();
        } catch {
            // Reason can be passed in request body
        }

        const parseResult = teamDeactivateSchema.safeParse(body);
        if (!parseResult.success) {
            const firstErr = parseResult.error.errors[0]?.message || 'Reason is required to deactivate a team';
            return NextResponse.json({ error: firstErr, details: parseResult.error.format() }, { status: 400 });
        }

        const data = parseResult.data;
        const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;

        // Execute admin_deactivate_team RPC
        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_deactivate_team', {
            p_team_id: teamId,
            p_expected_version: data.expected_version || null,
            p_caller_id: user.id,
            p_reason: data.reason,
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

        return NextResponse.json({ message: rpcRes.message || 'Team deactivated successfully' });

    } catch (err) {
        console.error('[API] Teams DELETE Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
