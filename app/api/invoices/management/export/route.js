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
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const fromDate = searchParams.get('fromDate') || searchParams.get('from_date');
        const toDate = searchParams.get('toDate') || searchParams.get('to_date');

        let query = supabaseAdmin
            .from('invoices')
            .select(`
                invoice_number,
                invoice_date,
                due_date,
                status,
                customer_snapshot,
                subtotal_paise,
                tax_paise,
                grand_total_paise,
                amount_paid_paise,
                public_payment_token,
                created_at,
                created_by
            `);

        // Scope to user's assigned invoices if non-manager executive
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

        query = query.order('created_at', { ascending: false });

        const { data: invoices, error } = await query;

        if (error) {
            console.error('[Invoice Export] Query error:', error);
            return NextResponse.json({ error: 'Failed to export invoices' }, { status: 500 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intrustindia.com';

        const escapeCsv = (val, isText = false) => {
            if (val === null || val === undefined) return '';
            let str = String(val);
            // F-03: Formula injection protection for textual cells (CWE-1236)
            if (isText && /^[=+\-@\t\r]/.test(str)) {
                str = "'" + str;
            }
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headers = [
            'Invoice Number',
            'Invoice Date',
            'Due Date',
            'Status',
            'Customer Name',
            'Customer Email',
            'Customer Phone',
            'Subtotal (INR)',
            'Tax (INR)',
            'Grand Total (INR)',
            'Amount Paid (INR)',
            'Balance Due (INR)',
            'Payment URL',
            'Created At'
        ];

        const rows = (invoices || []).map(inv => {
            const subtotal = ((inv.subtotal_paise || 0) / 100).toFixed(2);
            const tax = ((inv.tax_paise || 0) / 100).toFixed(2);
            const grandTotal = ((inv.grand_total_paise || 0) / 100).toFixed(2);
            const amountPaid = ((inv.amount_paid_paise || 0) / 100).toFixed(2);
            
            // F-04: CANCELLED, VOID, and PAID invoices have 0.00 active balance due
            const isInactive = inv.status === 'CANCELLED' || inv.status === 'VOID' || inv.status === 'PAID';
            const rawBalance = isInactive ? 0 : Math.max(0, (inv.grand_total_paise || 0) - (inv.amount_paid_paise || 0));
            const balanceDue = (rawBalance / 100).toFixed(2);

            const paymentUrl = `${baseUrl}/pay/invoice/${inv.public_payment_token}`;
            const createdAtStr = inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : '';

            return [
                escapeCsv(inv.invoice_number, true),
                escapeCsv(inv.invoice_date || '', true),
                escapeCsv(inv.due_date || '', true),
                escapeCsv(inv.status, true),
                escapeCsv(inv.customer_snapshot?.name || '', true),
                escapeCsv(inv.customer_snapshot?.email || '', true),
                escapeCsv(inv.customer_snapshot?.phone || '', true),
                escapeCsv(subtotal, false),
                escapeCsv(tax, false),
                escapeCsv(grandTotal, false),
                escapeCsv(amountPaid, false),
                escapeCsv(balanceDue, false),
                escapeCsv(paymentUrl, true),
                escapeCsv(createdAtStr, true)
            ].join(',');
        });

        const csvContent = [headers.map(h => escapeCsv(h, true)).join(','), ...rows].join('\r\n');
        const filename = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (err) {
        console.error('[Invoice Export] Server error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
