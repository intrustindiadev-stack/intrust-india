import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { sendInvoiceNotification } from '@/lib/notifications/invoiceNotificationService';

export async function POST(request, { params }) {
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
            return NextResponse.json({ error: 'Forbidden: You do not have access to manage notifications for this invoice' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({}));
        const notificationType = body.notificationType || 'INVOICE_RESENT';
        const channel = body.channel || 'EMAIL';
        // Enforce that recipient phone numbers must come from trusted invoice data.
        // Do not accept arbitrary recipient phone numbers from the browser.
        const recipient = channel === 'WHATSAPP' 
            ? null 
            : (body.recipient ? String(body.recipient).trim() : null);

        const ALLOWED_TYPES = ['INVOICE_CREATED', 'INVOICE_RESENT', 'PAYMENT_SUCCESS', 'PARTIAL_PAYMENT', 'PAYMENT_FAILED', 'DUE_SOON', 'OVERDUE'];
        const ALLOWED_CHANNELS = ['EMAIL', 'WHATSAPP'];

        if (!ALLOWED_TYPES.includes(notificationType)) {
            return NextResponse.json({ error: `Invalid notification type: ${notificationType}` }, { status: 400 });
        }

        if (!ALLOWED_CHANNELS.includes(channel)) {
            return NextResponse.json({ error: `Invalid notification channel: ${channel}` }, { status: 400 });
        }

        // Validate recipient format if explicitly overridden (EMAIL only)
        if (recipient && channel === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
            return NextResponse.json({ error: 'Invalid recipient email format' }, { status: 400 });
        }

        // Eligibility validation
        if ((notificationType === 'DUE_SOON' || notificationType === 'OVERDUE') && (invoice.status === 'PAID' || invoice.status === 'CANCELLED' || invoice.status === 'VOID')) {
            return NextResponse.json({ error: `Cannot send payment reminder for ${invoice.status} invoice` }, { status: 400 });
        }

        if (notificationType === 'PAYMENT_SUCCESS' && invoice.status !== 'PAID') {
            return NextResponse.json({ error: 'Cannot send payment receipt for unpaid invoice' }, { status: 400 });
        }

        const result = await sendInvoiceNotification({
            supabaseAdmin,
            invoiceId: id,
            notificationType,
            channel,
            recipient,
            actorId: user.id,
            metadata: {
                manual_trigger: true,
                triggered_by_role: profile.role
            }
        });

        if (result.cooldown) {
            return NextResponse.json({ error: result.reason }, { status: 429 });
        }

        if (!result.success) {
            if (result.skipped) {
                return NextResponse.json({ error: result.reason }, { status: 400 });
            }
            // Sanitize provider errors so technical details or tokens are not exposed
            let safeError = result.error || 'Failed to dispatch notification.';
            if (/template/i.test(safeError) && (/not found/i.test(safeError) || /unapproved/i.test(safeError) || /does not exist/i.test(safeError))) {
                safeError = 'WhatsApp template is pending approval or not configured in OmniFlow.';
            } else if (safeError.includes('{') || safeError.includes('token') || safeError.includes('http')) {
                safeError = 'WhatsApp provider temporarily unavailable. Please try again later.';
            }
            return NextResponse.json({ error: safeError }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            notificationId: result.notificationId,
            simulated: result.simulated || false,
            message: channel === 'WHATSAPP' 
                ? 'Invoice sent via InTrust WhatsApp.' 
                : `Notification (${notificationType}) queued for dispatch via ${channel}`
        });

    } catch (err) {
        console.error('[Invoice Notify API] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
