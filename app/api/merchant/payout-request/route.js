import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { notifyMerchantPayoutRequested } from '@/lib/notifications/merchantWhatsapp';

// GET  /api/merchant/payout-request  — merchant's own payout request history
// POST /api/merchant/payout-request  — submit a new payout request
export async function GET(request) {
    try {
        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const admin = createAdminClient();
        const { data, error } = await admin
            .from('payout_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('requested_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ requests: data });
    } catch (error) {
        console.error('[API] Payout GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// RPC error code → HTTP status
const RPC_ERROR_STATUS = {
    not_found:                 404,
    not_approved:              403,
    bank_not_verified:         403,
    invalid_bank_data:         400,
    amount_below_min:          400,
    below_minimum:             400, // legacy alias
    amount_above_max:          400,
    daily_cap_exceeded:        429,
    monthly_cap_exceeded:      429,
    pending_count_exceeded:        429,
    growth_fund_already_requested: 409,
    insufficient_balance:      400,
    invalid_source:            400,
    contract_not_found:        404,
    contract_not_matured:      400,
    incorrect_maturity_amount: 400,
};

// Human-readable messages for each RPC error code
const RPC_ERROR_MSG = {
    not_found:                 'Merchant profile not found.',
    not_approved:              'Merchant account is not approved yet.',
    bank_not_verified:         'Bank account not verified. Please complete bank verification in KYC settings before withdrawing.',
    invalid_bank_data:         'Bank account details are incomplete. Please update your KYC settings.',
    amount_below_min:          'Amount is below the minimum withdrawal limit.',
    below_minimum:             'Minimum withdrawal amount is ₹100.',
    amount_above_max:          'Amount exceeds the maximum allowed withdrawal limit.',
    daily_cap_exceeded:        'Your daily withdrawal limit has been reached. Please try again tomorrow.',
    monthly_cap_exceeded:      'Your monthly withdrawal limit has been reached. Please try again next month.',
    pending_count_exceeded:         "You've reached the maximum number of pending payout requests. Please wait for one to be processed.",
    growth_fund_already_requested: "A payout for this Growth Fund contract is already pending.",
    insufficient_balance:      'Insufficient wallet balance.',
    invalid_source:            'Invalid payout source.',
    contract_not_found:        'Contract not found.',
    contract_not_matured:      'Only unlocked (matured) growth funds can be requested for payout.',
    incorrect_maturity_amount: 'Incorrect maturity amount.',
};

export async function POST(request) {
    try {
        const { user } = await getAuthUser(request);
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { amount, source = 'wallet', reference_id } = body;

        // Early input validation
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }
        if (source === 'growth_fund' && !reference_id) {
            return NextResponse.json({ error: 'Contract ID required for Growth Fund payout' }, { status: 400 });
        }

        // Extract idempotency key and forensics from request headers
        const idempotencyKey     = request.headers.get('Idempotency-Key') || null;
        const requestedIp        = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
        const requestedUserAgent = request.headers.get('user-agent') || null;

        const amountNum   = Number(Number(amount).toFixed(2));
        const amountPaise = Math.round(amountNum * 100);
        const admin       = createAdminClient();

        // Delegate all money-moving writes to the atomic RPC
        const { data: rpcResult, error: rpcErr } = await admin.rpc('merchant_request_payout', {
            p_user_id:              user.id,
            p_amount_paise:         amountPaise,
            p_source:               source,
            p_reference_id:         reference_id || null,
            p_idempotency_key:      idempotencyKey,
            p_requested_ip:         requestedIp,
            p_requested_user_agent: requestedUserAgent,
        });

        if (rpcErr) {
            console.error('[API] merchant_request_payout RPC error:', rpcErr);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        if (!rpcResult?.success) {
            const code   = rpcResult?.error ?? 'unknown';
            const status = RPC_ERROR_STATUS[code] ?? 500;
            const msg    = RPC_ERROR_MSG[code]    ?? 'Payout request failed.';
            return NextResponse.json({ error: msg }, { status });
        }

        // Idempotency replay — return early without re-triggering notifications
        if (rpcResult?.replayed === true) {
            return NextResponse.json({
                success: true,
                replayed: true,
                request: { id: rpcResult.request_id },
            });
        }

        const requestId = rpcResult.request_id;

        // ---- Notification fan-out (best-effort, JS layer) ----

        // Notify all admin + super_admin users
        const { data: adminProfiles } = await admin
            .from('user_profiles')
            .select('id')
            .in('role', ['admin', 'super_admin']);

        if (adminProfiles && adminProfiles.length > 0) {
            const notifs = adminProfiles.map(ap => ({
                user_id:        ap.id,
                title:          'New Payout Request',
                body:           `A merchant has requested a withdrawal of ₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Review in the Payouts panel.`,
                type:           'info',
                reference_id:   requestId,
                reference_type: 'payout_request',
            }));
            await admin.from('notifications').insert(notifs);
        }

        // Self-notification for merchant
        await admin.from('notifications').insert([{
            user_id:        user.id,
            title:          'Withdrawal Request Submitted ✅',
            body:           `Your withdrawal request of ₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })} has been submitted and is under review.`,
            type:           'success',
            reference_type: 'payout_request',
            reference_id:   requestId,
        }]);

        // WhatsApp notification (fire-and-forget, best-effort)
        notifyMerchantPayoutRequested({
            merchantUserId: user.id,
            amountRs:       amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            source,
        }).catch(e => console.error('[Payout POST] WhatsApp notify failed:', e));

        return NextResponse.json({
            success: true,
            request: {
                id:                  requestId,
                balance_after_paise: rpcResult.balance_after_paise,
            },
        });
    } catch (error) {
        console.error('[API] Payout POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
