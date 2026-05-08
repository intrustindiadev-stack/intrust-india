import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = profile?.role;
        if (role !== 'admin' && role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = params;

        // Parse body for rejection reason
        const body = await request.json();
        const { rejection_reason } = body;

        if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length === 0) {
            return NextResponse.json(
                { error: 'Rejection reason is required' },
                { status: 400 }
            );
        }

        // Fetch the redemption request
        const { data: requestData, error: fetchError } = await admin
            .from('reward_redemption_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !requestData) {
            return NextResponse.json({ error: 'Redemption request not found' }, { status: 404 });
        }

        // Guard: must be pending
        if (requestData.status !== 'pending') {
            return NextResponse.json(
                { error: 'Request is not in pending status' },
                { status: 409 }
            );
        }

        // Update the redemption request as rejected
        const now = new Date().toISOString();
        const { error: updateError } = await admin
            .from('reward_redemption_requests')
            .update({
                status: 'rejected',
                rejection_reason: rejection_reason.trim(),
                processed_by: user.id,
                processed_at: now
            })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating redemption request:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Insert notification for the user
        try {
            await admin.from('notifications').insert({
                user_id: requestData.user_id,
                title: '❌ Redemption Rejected',
                body: `Your redemption request was rejected. Reason: ${rejection_reason.trim()}.`,
                type: 'error',
                reference_id: id,
                reference_type: 'reward_redemption'
            });
        } catch {
            // Non-fatal
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reject Redemption API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}