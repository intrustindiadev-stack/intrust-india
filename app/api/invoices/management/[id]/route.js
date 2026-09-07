import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

export async function GET(request, { params }) {
    try {
        const { id } = await params;
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

        // Fetch invoice
        const { data: invoice, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();

        if (invoiceError || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Ownership scoping for non-manager executives
        if (!isManagerOrAdmin && invoice.created_by !== user.id) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this invoice' }, { status: 403 });
        }

        // Fetch transactions
        const { data: transactions, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('udf1', 'INVOICE_PAY')
            .eq('udf2', id)
            .order('created_at', { ascending: false });

        // Fetch events
        const { data: events, error: eventsError } = await supabaseAdmin
            .from('invoice_events')
            .select('*, actor:user_profiles(full_name, email)')
            .eq('invoice_id', id)
            .order('created_at', { ascending: false });

        // Fetch notifications
        const { data: notifications } = await supabaseAdmin
            .from('invoice_notifications')
            .select('*')
            .eq('invoice_id', id)
            .order('created_at', { ascending: false });

        return NextResponse.json({
            success: true,
            data: {
                invoice,
                transactions: transactions || [],
                events: events || [],
                notifications: notifications || []
            }
        });

    } catch (err) {
        console.error('[Get Invoice Detail] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
