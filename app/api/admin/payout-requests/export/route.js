import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

// GET /api/admin/payout-requests/export
// Query params: from (ISO date), to (ISO date), merchant (business_name substring), status
export async function GET(request) {
    try {
        const { user, profile } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const fromDate     = searchParams.get('from');
        const toDate       = searchParams.get('to');
        const merchantName = searchParams.get('merchant');
        const statusFilter = searchParams.get('status');

        const admin = createAdminClient();

        let query = admin
            .from('payout_requests')
            .select(`
                id,
                amount,
                amount_paise,
                status,
                payout_source,
                bank_account_number,
                bank_ifsc,
                bank_account_holder,
                requested_at,
                reviewed_at,
                requested_ip,
                merchants:merchant_id (
                    business_name
                )
            `)
            .order('requested_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }
        if (fromDate) {
            query = query.gte('requested_at', new Date(fromDate).toISOString());
        }
        if (toDate) {
            // Include the full end day
            const end = new Date(toDate);
            end.setDate(end.getDate() + 1);
            query = query.lt('requested_at', end.toISOString());
        }
        if (merchantName) {
            query = query.ilike('merchants.business_name', `%${merchantName}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Build CSV
        const headers = [
            'id',
            'merchant',
            'amount',
            'amount_paise',
            'status',
            'payout_source',
            'bank_account_holder',
            'bank_account_number',
            'bank_ifsc',
            'requested_at',
            'reviewed_at',
            'requested_ip',
        ];

        const escape = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            // Wrap in quotes if contains comma, quote, or newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = (data || []).map(row => [
            row.id,
            row.merchants?.business_name ?? '',
            row.amount,
            row.amount_paise,
            row.status,
            row.payout_source,
            row.bank_account_holder,
            row.bank_account_number, // full number in export (admin-only)
            row.bank_ifsc,
            row.requested_at,
            row.reviewed_at ?? '',
            row.requested_ip ?? '',
        ].map(escape).join(','));

        const csv = [headers.join(','), ...rows].join('\r\n');

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename="payout-requests.csv"',
            },
        });
    } catch (error) {
        console.error('[API] Admin Payout Export Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
