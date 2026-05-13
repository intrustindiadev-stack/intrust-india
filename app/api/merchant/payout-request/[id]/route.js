import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// DELETE /api/merchant/payout-request/[id]  — merchant cancels their own pending payout
export async function DELETE(request, { params }) {
    try {
        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const admin = createAdminClient();

        const { data: rpcResult, error: rpcErr } = await admin.rpc('merchant_cancel_pending_payout', {
            p_user_id:    user.id,
            p_request_id: id,
        });

        if (rpcErr) {
            console.error('[API] merchant_cancel_pending_payout RPC error:', rpcErr);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        if (!rpcResult?.success) {
            const code = rpcResult?.error ?? 'unknown';
            if (code === 'not_found') {
                return NextResponse.json({ error: 'Payout request not found.' }, { status: 404 });
            }
            if (code === 'not_cancellable') {
                return NextResponse.json({ error: 'Only pending payout requests can be cancelled.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Failed to cancel payout request.' }, { status: 500 });
        }

        // Self-notification for merchant
        await admin.from('notifications').insert([{
            user_id:        user.id,
            title:          'Withdrawal Cancelled',
            body:           'Your payout request has been cancelled and your balance restored.',
            type:           'info',
            reference_type: 'payout_request',
            reference_id:   id,
        }]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Merchant Payout DELETE Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
