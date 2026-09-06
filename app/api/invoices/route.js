import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { sendInvoiceNotification } from '@/lib/notifications/invoiceNotificationService';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify the user has the right role (Admin/CRM)
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

        const body = await request.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { seller, customer, items, totals, meta } = body;

        if (!meta?.invoice_number) {
            return NextResponse.json({ error: 'Invoice number is required.' }, { status: 400 });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Invoice must contain at least one item.' }, { status: 400 });
        }

        // Server-side validation of line items & math consistency
        let computedSubtotalPaise = 0;
        for (let i = 0; i < items.length; i++) {
            const itm = items[i];
            const qty = Number(itm.quantity || itm.qty || 0);
            const rate = Number(itm.rate || itm.unit_price || itm.price || 0);
            if (!Number.isFinite(qty) || qty <= 0) {
                return NextResponse.json({ error: `Invalid quantity for item at line ${i + 1}` }, { status: 400 });
            }
            if (!Number.isFinite(rate) || rate < 0) {
                return NextResponse.json({ error: `Invalid rate for item at line ${i + 1}` }, { status: 400 });
            }
            computedSubtotalPaise += Math.round(qty * rate * 100);
        }

        const grandTotalPaise = Math.round((totals?.grandTotal || 0) * 100);
        const subtotalPaise = Math.round((totals?.subtotal || 0) * 100);
        const taxPaise = Math.round((totals?.totalGst || totals?.tax || 0) * 100);
        const discountPaise = Math.round((totals?.discount || 0) * 100);

        if (!Number.isFinite(grandTotalPaise) || grandTotalPaise <= 0) {
            return NextResponse.json({ error: 'Invoice total must be greater than zero.' }, { status: 400 });
        }

        // Validate line items sum matches subtotal (allowing 1 paise rounding tolerance)
        if (Math.abs(computedSubtotalPaise - subtotalPaise) > 1) {
            return NextResponse.json({
                error: `Subtotal mismatch: line items sum to ₹${(computedSubtotalPaise / 100).toFixed(2)}, but received ₹${(subtotalPaise / 100).toFixed(2)}.`
            }, { status: 400 });
        }

        // Validate grand total = subtotal + tax - discount (allowing 1 paise rounding tolerance)
        const expectedGrandTotal = subtotalPaise + taxPaise - discountPaise;
        if (Math.abs(expectedGrandTotal - grandTotalPaise) > 1) {
            return NextResponse.json({
                error: `Total calculation mismatch: subtotal + tax - discount is ₹${(expectedGrandTotal / 100).toFixed(2)}, but received ₹${(grandTotalPaise / 100).toFixed(2)}.`
            }, { status: 400 });
        }

        // Generate a cryptographically secure 32-character hex token
        const publicPaymentToken = crypto.randomBytes(16).toString('hex');

        const newInvoice = {
            invoice_number: meta.invoice_number,
            invoice_date: meta.invoice_date || new Date().toISOString().split('T')[0],
            seller_snapshot: seller,
            customer_snapshot: customer,
            items_snapshot: items,
            subtotal_paise: subtotalPaise,
            discount_paise: discountPaise,
            tax_paise: taxPaise,
            grand_total_paise: grandTotalPaise,
            amount_paid_paise: 0,
            status: 'ISSUED',
            public_payment_token: publicPaymentToken,
            created_by: user.id
        };

        const { data: invoice, error: insertError } = await supabaseAdmin
            .from('invoices')
            .insert(newInvoice)
            .select('id, invoice_number, public_payment_token, grand_total_paise')
            .single();

        if (insertError) {
            console.error('[Create Invoice] Error inserting invoice:', insertError);
            return NextResponse.json({ error: 'Failed to create invoice.', details: insertError.message }, { status: 500 });
        }

        // Record INVOICE_CREATED in audit events
        await supabaseAdmin
            .from('invoice_events')
            .insert({
                invoice_id: invoice.id,
                actor_id: user.id,
                event_type: 'INVOICE_CREATED',
                description: `Invoice ${invoice.invoice_number} created for ₹${(grandTotalPaise / 100).toFixed(2)}`,
                metadata: {
                    grand_total_paise: grandTotalPaise,
                    subtotal_paise: subtotalPaise,
                    tax_paise: taxPaise,
                    discount_paise: discountPaise,
                    item_count: items.length,
                    creator_role: profile.role
                }
            });

        const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intrustindia.com'}/pay/invoice/${invoice.public_payment_token}`;

        // Trigger initial invoice created notification (non-blocking)
        if (customer?.email) {
            sendInvoiceNotification({
                supabaseAdmin,
                invoiceId: invoice.id,
                notificationType: 'INVOICE_CREATED',
                channel: 'EMAIL',
                actorId: user.id
            }).catch(notifErr => {
                console.error('[Create Invoice] Failed to send initial creation email:', notifErr.message);
            });
        }

        return NextResponse.json({
            success: true,
            invoice: {
                ...invoice,
                payment_url: paymentUrl
            }
        });

    } catch (err) {
        console.error('[Create Invoice] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
