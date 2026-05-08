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

        // Call the RPC to convert points to wallet
        const { data: rpcResult, error: rpcError } = await admin.rpc('convert_points_to_wallet', {
            p_user_id: requestData.user_id,
            p_points: requestData.points_requested
        });

        if (rpcError) {
            console.error('Error converting points via RPC:', rpcError);
            return NextResponse.json({ error: rpcError.message || 'Conversion failed' }, { status: 500 });
        }

        // Parse the result (returned as JSONB)
        const parsedResult = typeof rpcResult === 'string' ? JSON.parse(rpcResult) : rpcResult;

        if (!parsedResult?.success) {
            return NextResponse.json({
                success: false,
                message: parsedResult?.message || 'Conversion failed'
            }, { status: 400 });
        }

        // Update the redemption request as completed
        const now = new Date().toISOString();
        const { error: updateError } = await admin
            .from('reward_redemption_requests')
            .update({
                status: 'completed',
                processed_by: user.id,
                processed_at: now
            })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating redemption request:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Insert notification for the user
        const rupees = (requestData.rupee_value_paise / 100).toFixed(2);
        try {
            await admin.from('notifications').insert({
                user_id: requestData.user_id,
                title: '✅ Redemption Approved',
                body: `Your redemption of ${requestData.points_requested} points (₹${rupees}) has been approved and credited to your wallet.`,
                type: 'success',
                reference_id: id,
                reference_type: 'reward_redemption'
            });
        } catch {
            // Non-fatal
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Approve Redemption API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}