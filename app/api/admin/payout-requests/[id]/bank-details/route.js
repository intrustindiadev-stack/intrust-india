import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/admin/payout-requests/[id]/bank-details
// Returns the full bank_account_number for a payout request and logs the PII access.
export async function GET(request, { params }) {
    try {
        const { user, profile } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id } = await params;
        const admin = createAdminClient();

        // Fetch the full bank account number for this payout request
        const { data: payoutReq, error: fetchErr } = await admin
            .from('payout_requests')
            .select('bank_account_number')
            .eq('id', id)
            .single();

        if (fetchErr || !payoutReq) {
            return NextResponse.json({ error: 'Payout request not found' }, { status: 404 });
        }

        // Log PII access (best-effort)
        const ip =
            request.headers.get('x-forwarded-for') ??
            request.headers.get('x-real-ip') ??
            null;

        await admin.from('payout_pii_access_log').insert({
            payout_id:     id,
            admin_user_id: user.id,
            accessed_at:   new Date().toISOString(),
            ip,
        });

        return NextResponse.json({ bank_account_number: payoutReq.bank_account_number });
    } catch (error) {
        console.error('[API] Admin Payout Bank Details GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
