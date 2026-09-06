import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

export async function POST(request, { params }) {
    try {
        const { id } = params;
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
            .select('status, created_by')
            .eq('id', id)
            .single();

        if (invoiceError || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Ownership scoping for non-manager executives
        if (!isManagerOrAdmin && invoice.created_by !== user.id) {
            return NextResponse.json({ error: 'Forbidden: You can only cancel invoices you created.' }, { status: 403 });
        }

        if (invoice.status !== 'ISSUED') {
            return NextResponse.json({ error: 'Only ISSUED invoices can be cancelled' }, { status: 400 });
        }

        // Atomic update with row check to prevent duplicate events on concurrent requests
        const { data: updatedRows, error: updateError } = await supabaseAdmin
            .from('invoices')
            .update({ status: 'CANCELLED' })
            .eq('id', id)
            .eq('status', 'ISSUED')
            .select('id');

        if (updateError) {
            return NextResponse.json({ error: 'Failed to cancel invoice' }, { status: 500 });
        }

        if (!updatedRows || updatedRows.length === 0) {
            return NextResponse.json({ error: 'Invoice has already been cancelled or status changed.' }, { status: 409 });
        }

        await supabaseAdmin
            .from('invoice_events')
            .insert({
                invoice_id: id,
                actor_id: user.id,
                event_type: 'CANCELLED',
                description: 'Invoice was cancelled manually.',
                metadata: {
                    cancelled_by_role: profile.role
                }
            });

        return NextResponse.json({ success: true, message: 'Invoice cancelled successfully' });

    } catch (err) {
        console.error('[Cancel Invoice] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
