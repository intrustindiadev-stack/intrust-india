import { createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// PATCH /api/admin/payout-requests/[id]
// body: { action: 'approved' | 'rejected' | 'released', admin_note?: string }
export async function PATCH(request, { params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        const admin = createAdminClient();

        let user = null;
        if (token) {
            const { data: { user: tokenUser }, error } = await admin.auth.getUser(token);
            if (!error) user = tokenUser;
        }
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await admin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, admin_note } = body;

        const VALID_ACTIONS = ['approved', 'rejected', 'released'];
        if (!VALID_ACTIONS.includes(action)) {
            return NextResponse.json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
        }

        // Fetch current payout request
        const { data: payoutReq, error: prFetchErr } = await admin
            .from('payout_requests')
            .select('*, merchants:merchant_id(id, user_id, wallet_balance_paise, business_name)')
            .eq('id', id)
            .single();

        if (prFetchErr || !payoutReq) {
            return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
        }

        // Guard against invalid state transitions
        if (payoutReq.status === 'released') {
            return NextResponse.json({ error: 'This request has already been released.' }, { status: 409 });
        }
        if (payoutReq.status === 'rejected') {
            return NextResponse.json({ error: 'This request has already been rejected.' }, { status: 409 });
        }
        if (payoutReq.status === 'approved' && action === 'approved') {
            return NextResponse.json({ error: 'This request is already approved.' }, { status: 409 });
        }

        const merchant = payoutReq.merchants;
        const amountPaise = Math.round(payoutReq.amount * 100);

        // ---- HANDLE REJECTED: refund wallet ----
        if (action === 'rejected') {
            const currentBalance = merchant.wallet_balance_paise || 0;
            const { error: refundErr } = await admin
                .from('merchants')
                .update({ wallet_balance_paise: currentBalance + amountPaise })
                .eq('id', merchant.id);

            if (refundErr) throw refundErr;

            // Log refund transaction
            await admin.from('wallet_transactions').insert({
                user_id: merchant.user_id,
                merchant_id: merchant.id,
                transaction_type: 'CREDIT',
                amount: payoutReq.amount,
                description: `Payout request #${id.slice(0, 8).toUpperCase()} rejected — amount refunded`,
                reference_type: 'payout_request',
                reference_id: id,
            });
        }

        // ---- UPDATE PAYOUT REQUEST STATUS ----
        const { error: updateErr } = await admin
            .from('payout_requests')
            .update({
                status: action,
                admin_note: admin_note || null,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (updateErr) throw updateErr;

        // ---- SEND NOTIFICATION TO MERCHANT ----
        /** @type {{ title: string; body: string; type: 'success' | 'error' | 'info' }} */
        const notifMap = {
            approved: {
                title: '✅ Payout Request Approved',
                body: `Your withdrawal of ₹${Number(payoutReq.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been approved. Payment will be transferred soon.`,
                type: 'success',
            },
            rejected: {
                title: '❌ Payout Request Rejected',
                body: `Your withdrawal of ₹${Number(payoutReq.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} was rejected${admin_note ? `: ${admin_note}` : '. Please contact support for details.'}. Amount has been refunded to your wallet.`,
                type: 'error',
            },
            released: {
                title: '💰 Payment Released!',
                body: `Your payout of ₹${Number(payoutReq.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been released to your bank account. Please allow 1–2 business days for the transfer to reflect.`,
                type: 'success',
            },
        };

        const notifData = notifMap[action];
        await admin.from('notifications').insert({
            user_id: merchant.user_id,
            title: notifData.title,
            body: notifData.body,
            type: notifData.type,
            reference_id: id,
            reference_type: 'payout_request',
        });

        return NextResponse.json({
            success: true,
            message: `Payout request ${action} successfully.`,
        });
    } catch (error) {
        console.error('[API] Admin Payout PATCH Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
