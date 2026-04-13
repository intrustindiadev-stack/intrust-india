import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/admin/payout-requests — list all payout requests for admin
export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Parse query params for filtering
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status'); // pending | approved | rejected | released | all

        let query = admin
            .from('payout_requests')
            .select(`
                *,
                merchants:merchant_id (
                    id,
                    business_name,
                    user_id,
                    bank_data,
                    wallet_balance_paise
                )
            `)
            .order('requested_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ requests: data || [] });
    } catch (error) {
        console.error('[API] Admin Payout GET Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
