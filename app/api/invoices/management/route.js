import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { buildInvoiceSearchFilter } from '@/lib/invoices/searchUtils';

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = createAdminClient();
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const allowedRoles = ['admin', 'super_admin', 'sales_exec', 'sales_manager', 'relationship_exec', 'relationship_manager'];
        if (!profile || !allowedRoles.includes(profile.role)) {
            return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
        }

        const isManagerOrAdmin = ['admin', 'super_admin', 'sales_manager', 'relationship_manager'].includes(profile.role);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const fromDate = searchParams.get('fromDate') || searchParams.get('from_date');
        const toDate = searchParams.get('toDate') || searchParams.get('to_date');

        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from('invoices')
            .select('id, invoice_number, invoice_date, customer_snapshot, grand_total_paise, amount_paid_paise, status, public_payment_token, created_by', { count: 'exact' });

        // Scoping: non-manager executives only see invoices they created
        if (!isManagerOrAdmin) {
            query = query.eq('created_by', user.id);
        }

        if (status) {
            query = query.eq('status', status);
        }

        if (fromDate) {
            query = query.gte('invoice_date', fromDate);
        }

        if (toDate) {
            query = query.lte('invoice_date', toDate);
        }

        if (search) {
            const searchFilter = buildInvoiceSearchFilter(search);
            if (searchFilter) {
                query = query.or(searchFilter);
            }
        }

        query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

        const { data: invoices, count, error } = await query;

        if (error) {
            console.error('[Get Invoices] Error:', error);
            return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
        }

        // Calculate scoped summary stats across all accessible invoices
        let summaryQuery = supabaseAdmin
            .from('invoices')
            .select('status, grand_total_paise, amount_paid_paise');

        if (!isManagerOrAdmin) {
            summaryQuery = summaryQuery.eq('created_by', user.id);
        }

        const { data: summaryRows } = await summaryQuery;

        let totalInvoices = 0;
        let paidAmountPaise = 0;
        let outstandingAmountPaise = 0;
        let paidCount = 0;
        let outstandingCount = 0;
        let cancelledCount = 0;

        if (summaryRows) {
            totalInvoices = summaryRows.length;
            for (const row of summaryRows) {
                if (row.status === 'PAID') {
                    paidCount++;
                    paidAmountPaise += (row.amount_paid_paise || row.grand_total_paise || 0);
                } else if (row.status === 'ISSUED' || row.status === 'PARTIALLY_PAID') {
                    outstandingCount++;
                    const due = Math.max(0, (row.grand_total_paise || 0) - (row.amount_paid_paise || 0));
                    outstandingAmountPaise += due;
                    if (row.amount_paid_paise > 0) {
                        paidAmountPaise += row.amount_paid_paise;
                    }
                } else if (row.status === 'CANCELLED' || row.status === 'VOID') {
                    cancelledCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            invoices,
            summary: {
                totalInvoices,
                paidAmountPaise,
                outstandingAmountPaise,
                paidCount,
                outstandingCount,
                cancelledCount
            },
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });

    } catch (err) {
        console.error('[Get Invoices] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
