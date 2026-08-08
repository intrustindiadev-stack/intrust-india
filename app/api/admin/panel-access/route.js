import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { user, profile, admin: adminSupabase } = await getAuthUser(request);

        // 1. Verify Authentication & Role
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden. Admin Access required.' }, { status: 403 });
        }

        // 2. Fetch pending requests with user and team details
        const { data, error } = await adminSupabase
            .from('panel_access_requests')
            .select(`
                *,
                user_profiles:user_id (id, full_name, email, phone, city),
                teams:team_id (id, name, city, state, area, zone),
                hr:requested_by (id, full_name)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching panel access requests:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { user, profile, admin: adminSupabase } = await getAuthUser(request);

        // 1. Verify Authentication & Role
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden. Admin Access required.' }, { status: 403 });
        }

        const { requestId, action, rejectReason } = await request.json();

        if (!requestId || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
        }

        // 2. Get Request Details
        const { data: accessReq, error: reqError } = await adminSupabase
            .from('panel_access_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (reqError || !accessReq) {
            return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
        }

        if (accessReq.status !== 'pending') {
            return NextResponse.json({ error: 'Request is no longer pending.' }, { status: 400 });
        }

        // 3. Process action
        if (action === 'approve') {
            // Update User Profile role
            const { error: updateRoleError } = await adminSupabase
                .from('user_profiles')
                .update({ role: accessReq.requested_role })
                .eq('id', accessReq.user_id);

            if (updateRoleError) throw updateRoleError;

            // Update Request Status
            await adminSupabase
                .from('panel_access_requests')
                .update({
                    status: 'approved',
                    approved_by: user.id,
                    approved_at: new Date().toISOString()
                })
                .eq('id', requestId);

            // Log Audit
            await adminSupabase.from('audit_logs').insert({
                actor_id: user.id,
                actor_role: userProfile.role,
                action: 'approve_panel_access',
                entity_type: 'user',
                entity_id: accessReq.user_id,
                description: `Approved panel access (${accessReq.requested_role}) for user ${accessReq.user_id}`,
                metadata: { request_id: requestId, requested_role: accessReq.requested_role }
            });

            // Notify Employee & HR
            await adminSupabase.from('notifications').insert([
                {
                    user_id: accessReq.user_id,
                    title: 'Panel Access Approved',
                    body: `Your request for ${accessReq.requested_role} panel access has been approved.`,
                    type: 'success',
                    reference_type: 'panel_access_approved',
                    reference_id: requestId,
                    read: false
                },
                {
                    user_id: accessReq.requested_by,
                    title: 'Panel Access Approved',
                    body: `Panel access (${accessReq.requested_role}) has been approved.`,
                    type: 'success',
                    reference_type: 'panel_access_approved',
                    reference_id: requestId,
                    read: false
                }
            ]);

        } else if (action === 'reject') {
            if (!rejectReason) {
                 return NextResponse.json({ error: 'Reject reason is required.' }, { status: 400 });
            }
            
            // Update Request Status
            await adminSupabase
                .from('panel_access_requests')
                .update({
                    status: 'rejected',
                    rejected_reason: rejectReason,
                    approved_at: new Date().toISOString()
                })
                .eq('id', requestId);
                
            // Log Audit
            await adminSupabase.from('audit_logs').insert({
                actor_id: user.id,
                actor_role: userProfile.role,
                action: 'reject_panel_access',
                entity_type: 'user',
                entity_id: accessReq.user_id,
                description: `Rejected panel access (${accessReq.requested_role}) for user ${accessReq.user_id}`,
                metadata: { request_id: requestId, requested_role: accessReq.requested_role, reason: rejectReason }
            });

            // Notify Employee & HR
            await adminSupabase.from('notifications').insert([
                {
                    user_id: accessReq.user_id,
                    title: 'Panel Access Rejected',
                    body: `Your request for ${accessReq.requested_role} panel access was rejected. Reason: ${rejectReason}`,
                    type: 'error',
                    reference_type: 'panel_access_rejected',
                    reference_id: requestId,
                    read: false
                },
                {
                    user_id: accessReq.requested_by,
                    title: 'Panel Access Rejected',
                    body: `Panel access (${accessReq.requested_role}) was rejected. Reason: ${rejectReason}`,
                    type: 'error',
                    reference_type: 'panel_access_rejected',
                    reference_id: requestId,
                    read: false
                }
            ]);
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
