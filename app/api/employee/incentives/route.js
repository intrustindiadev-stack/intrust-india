import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function GET(request) {
    try {
        const { user, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ success: false, code: 'UNAUTHORIZED', error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
        const status = searchParams.get('status');
        const year = searchParams.get('year');

        const offset = (page - 1) * limit;

        // Query caller's allocations
        let query = admin
            .from('incentive_allocations')
            .select(`
                id, batch_id, employee_id, amount_paise, status, paid_at, created_at,
                batch:incentive_batches (
                    id, incentive_type, description, effective_date, payroll_month, payroll_year, status
                )
            `, { count: 'exact' })
            .eq('employee_id', user.id);

        if (status) {
            query = query.eq('status', status);
        }

        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: allocations, count, error } = await query;
        if (error) throw error;

        // Fetch total paid YTD for caller
        const currentYear = new Date().getFullYear();
        const { data: paidAllocations } = await admin
            .from('incentive_allocations')
            .select('amount_paise, paid_at')
            .eq('employee_id', user.id)
            .eq('status', 'paid');

        const paidYTD = (paidAllocations || [])
            .filter(a => a.paid_at && new Date(a.paid_at).getFullYear() === currentYear)
            .reduce((acc, a) => acc + (a.amount_paise || 0), 0);

        const approvedUpcoming = (allocations || [])
            .filter(a => a.status === 'approved')
            .reduce((acc, a) => acc + (a.amount_paise || 0), 0);

        const totalPages = Math.ceil((count || 0) / limit);

        const response = NextResponse.json({
            success: true,
            summary: {
                paid_ytd_paise: paidYTD,
                approved_upcoming_paise: approvedUpcoming,
            },
            data: allocations || [],
            meta: {
                page,
                limit,
                total: count || 0,
                totalPages
            }
        });

        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return response;

    } catch (err) {
        console.error('[API] Fetch Employee Incentives Error:', err);
        return NextResponse.json({ success: false, code: 'INTERNAL_ERROR', error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
