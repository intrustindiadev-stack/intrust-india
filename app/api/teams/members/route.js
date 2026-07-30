import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const MEMBER_WRITE_ROLES = ['admin', 'super_admin', 'sales_manager'];

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!MEMBER_WRITE_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin or Sales Manager access required' }, { status: 403 });
        }

        const body = await request.json();
        const { team_id, user_id } = body;

        if (!team_id || !user_id) {
            return NextResponse.json({ error: 'team_id and user_id are required' }, { status: 400 });
        }

        // Execute admin_add_team_member RPC
        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_add_team_member', {
            p_team_id: team_id,
            p_user_id: user_id,
            p_caller_id: user.id
        });

        if (rpcErr) throw rpcErr;
        if (!rpcRes?.success) {
            return NextResponse.json({ error: rpcRes?.error || 'Failed to add member to team' }, { status: 400 });
        }

        // Return updated user profile
        const { data: userProfile } = await admin
            .from('user_profiles')
            .select('id, full_name, email, role, avatar_url, phone, team_id')
            .eq('id', user_id)
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
        if (!MEMBER_WRITE_ROLES.includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden: Admin or Sales Manager access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const user_id = searchParams.get('user_id');

        if (!user_id) {
            return NextResponse.json({ error: 'user_id query param is required' }, { status: 400 });
        }

        // Execute admin_remove_team_member RPC
        const { data: rpcRes, error: rpcErr } = await admin.rpc('admin_remove_team_member', {
            p_user_id: user_id,
            p_caller_id: user.id
        });

        if (rpcErr) throw rpcErr;
        if (!rpcRes?.success) {
            return NextResponse.json({ error: rpcRes?.error || 'Failed to remove team member' }, { status: 400 });
        }

        return NextResponse.json({ message: 'Team member removed successfully' });
    } catch (err) {
        console.error('[API] Team Members DELETE Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
