import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { notifyMerchantPayoutStatus } from '@/lib/notifications/merchantWhatsapp';

// PATCH /api/admin/payout-requests/[id]
// body: { action: 'approved' | 'rejected' | 'released', admin_note?: string, utr_reference?: string }
export async function PATCH(request, { params }) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, admin_note, utr_reference } = body;

        const VALID_ACTIONS = ['approved', 'rejected', 'released'];
        if (!VALID_ACTIONS.includes(action)) {
            return NextResponse.json({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
        }

        // Validation guards
        if (action === 'rejected' && !admin_note?.trim()) {
            return NextResponse.json({ error: 'Admin note is required for rejection' }, { status: 400 });
        }
        if (action === 'released' && !utr_reference?.trim()) {
            return NextResponse.json({ error: 'UTR reference is required to mark as released' }, { status: 400 });
        }

        // Fetch current payout request (for notification data)
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
        // Only block duplicate approve; reject is allowed from both pending and approved
        if (payoutReq.status === 'approved' && action === 'approved') {
            return NextResponse.json({ error: 'This request is already approved.' }, { status: 409 });
        }

        const merchant    = payoutReq.merchants;
        const isGrowthFund = payoutReq.payout_source === 'growth_fund';

        // ---- HANDLE REJECTED: delegate to atomic RPC ----
        if (action === 'rejected') {
            const { data: result, error: rpcErr } = await admin.rpc('admin_reject_payout', {
                p_request_id:    id,
                p_admin_user_id: user.id,
                p_admin_note:    admin_note || null,
            });

            if (rpcErr) throw rpcErr;
            if (!result?.success) {
                throw new Error(result?.error || 'Failed to reject payout');
            }
            // RPC already updated payout_requests — skip the inline UPDATE below
        }

        // ---- HANDLE RELEASED: new 4-param atomic RPC ----
        else if (action === 'released') {
            const { error: rpcErr, data: result } = await admin.rpc('admin_approve_payout', {
                p_payout_request_id: id,
                p_admin_user_id:     user.id,
                p_admin_note:        admin_note || null,
                p_utr_reference:     utr_reference,
            });
            if (rpcErr) throw rpcErr;
            if (!result || !result.success) throw new Error(result?.error || 'Failed to release payout');
            // fall through to notification block
        }

        // ---- HANDLE APPROVED: simple status update (no money moves) ----
        else if (action === 'approved') {
            const { error: updateErr } = await admin
                .from('payout_requests')
                .update({
                    status:      action,
                    admin_note:  admin_note || null,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    approved_by: user.id,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', id);

            if (updateErr) throw updateErr;

            // Write audit event (rejected/released paths delegate to RPCs which write their own events)
            await admin.from('payout_request_events').insert({
                payout_id:   id,
                actor_id:    user.id,
                action:      'approved',
                from_status: payoutReq.status,
                to_status:   'approved',
                payload:     admin_note ? { admin_note } : null,
            });
        }

        // ---- SEND NOTIFICATION TO MERCHANT ----
        const baseBody = `Your ${isGrowthFund ? 'Growth Fund release' : 'withdrawal'} of ₹${Number(payoutReq.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        const notifMap = {
            approved: {
                title: '✅ Payout Approved',
                body:  `${baseBody} has been approved. Payment will be transferred soon.`,
                type:  'success',
            },
            rejected: {
                title: '❌ Payout Rejected',
                body:  `${baseBody} was rejected${admin_note ? `: ${admin_note}` : '. Contact support for details.'}.${isGrowthFund ? ' The fund is available for re-request.' : ' Amount refunded to wallet.'}`,
                type:  'error',
            },
            released: {
                title: '💰 Payment Released!',
                body:  `${baseBody} has been released to your bank account.${utr_reference ? ` UTR: ${utr_reference}` : ''}`,
                type:  'success',
            },
        };

        const notifData = notifMap[action];
        await admin.from('notifications').insert({
            user_id:        merchant.user_id,
            title:          notifData.title,
            body:           notifData.body,
            type:           notifData.type,
            reference_id:   id,
            reference_type: 'payout_request',
        });

        // Awaited WhatsApp notification (with error logging, no fire-and-forget)
        try {
            const statusMap = { approved: 'Approved', rejected: 'Rejected', released: 'Paid' };
            await notifyMerchantPayoutStatus({
                merchantUserId: merchant.user_id,
                amountRs:       Number(payoutReq.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                status:         statusMap[action],
                note:           admin_note || '',
            });
        } catch (e) {
            console.error('[Payout PATCH] WhatsApp dispatch failed:', e);
        }

        return NextResponse.json({
            success: true,
            message: `Payout request ${action} successfully.`,
        });
    } catch (error) {
        console.error('[API] Admin Payout PATCH Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
