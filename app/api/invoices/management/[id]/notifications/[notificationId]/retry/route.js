import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { retryInvoiceNotification } from '@/lib/notifications/invoiceNotificationService';

export async function POST(request, { params }) {
    try {
        const { id: invoiceId, notificationId } = await params;
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
            .select('id, created_by')
            .eq('id', invoiceId)
            .single();

        if (invoiceError || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // Ownership scoping for non-manager executives
        if (!isManagerOrAdmin && invoice.created_by !== user.id) {
            return NextResponse.json({ error: 'Forbidden: You do not have access to this invoice' }, { status: 403 });
        }

        // Verify that notification belongs to this specific invoice (prevent IDOR)
        const { data: targetNotif, error: notifCheckErr } = await supabaseAdmin
            .from('invoice_notifications')
            .select('id, invoice_id')
            .eq('id', notificationId)
            .single();

        if (notifCheckErr || !targetNotif) {
            return NextResponse.json({ error: 'Notification record not found' }, { status: 404 });
        }

        if (targetNotif.invoice_id !== invoiceId) {
            return NextResponse.json({ error: 'Forbidden: Notification does not belong to this invoice' }, { status: 400 });
        }

        const result = await retryInvoiceNotification({
            supabaseAdmin,
            notificationId,
            actorId: user.id
        });

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to retry notification' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Notification retry initiated successfully'
        });

    } catch (err) {
        console.error('[Invoice Retry API] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
