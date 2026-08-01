import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import {
    getAuthorizedTeamScope,
    memberAssignSchema,
    memberBulkTransferSchema,
    formatErrorResponse
} from '@/lib/teamAuth';

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getAuthorizedTeamScope(user, profile, admin);
        if (!scope.capabilities.canAssignMembers) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions to assign team members' }, { status: 403 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
        }

        const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;

        // Check if this is a bulk transfer request
        if (body.source_team_id || Array.isArray(body.user_ids)) {
            const parseResult = memberBulkTransferSchema.safeParse(body);
            if (!parseResult.success) {
                const firstErr = parseResult.error.errors[0]?.message || 'Validation failed';
                return NextResponse.json({ error: firstErr, details: parseResult.error.format() }, { status: 400 });
            }

            const data = parseResult.data;

            const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_bulk_transfer_members', {
                p_source_team_id: data.source_team_id,
                p_target_team_id: data.target_team_id,
                p_user_ids: data.user_ids,
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

            return NextResponse.json({
                message: rpcRes.message || 'Bulk transfer completed successfully',
                transferred_count: rpcRes.transferred_count
            });
        }

        // Single member assignment
        const parseResult = memberAssignSchema.safeParse(body);
        if (!parseResult.success) {
            const firstErr = parseResult.error.errors[0]?.message || 'Validation failed';
            return NextResponse.json({ error: firstErr, details: parseResult.error.format() }, { status: 400 });
        }

        const data = parseResult.data;

        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_add_team_member', {
            p_team_id: data.team_id,
            p_user_id: data.user_id,
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

        // Fetch updated user profile
        const { data: userProfile } = await admin
            .from('user_profiles')
            .select('id, full_name, email, role, avatar_url, phone, team_id')
            .eq('id', data.user_id)
            .single();

        return NextResponse.json({
            message: 'Team member assigned successfully',
            user: userProfile
        });

    } catch (err) {
        console.error('[API] Team Members POST Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const scope = await getAuthorizedTeamScope(user, profile, admin);
        if (!scope.capabilities.canAssignMembers) {
            return NextResponse.json({ error: 'Forbidden: Insufficient permissions to remove team members' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        let user_id = searchParams.get('user_id');
        let team_id = searchParams.get('team_id');
        let reason = searchParams.get('reason');

        if (!user_id) {
            try {
                const body = await request.json();
                user_id = body.user_id;
                team_id = body.team_id || team_id;
                reason = body.reason || reason;
            } catch {
                // Ignore empty JSON body
            }
        }

        if (!user_id) {
            return NextResponse.json({ error: 'user_id query parameter or body property is required' }, { status: 400 });
        }

        const requestId = request.headers.get('x-request-id') || `req_${Date.now()}`;

        // Execute admin_remove_team_member RPC
        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_remove_team_member', {
            p_user_id: user_id,
            p_caller_id: user.id,
            p_team_id: team_id || null,
            p_reason: reason || null,
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

        return NextResponse.json({ message: 'Team member removed successfully' });

    } catch (err) {
        console.error('[API] Team Members DELETE Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
