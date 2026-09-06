import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { sendInvoiceNotification } from '@/lib/notifications/invoiceNotificationService';
import crypto from 'crypto';

export const maxDuration = 300;

export async function GET(request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || cronSecret.trim().length === 0) {
        console.error('[Invoice Reminders Cron] Server configuration error: CRON_SECRET is not set');
        return NextResponse.json({ error: 'Server configuration error: CRON_SECRET is not set' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const expectedAuth = `Bearer ${cronSecret}`;

    const authBuffer = Buffer.from(authHeader);
    const expectedBuffer = Buffer.from(expectedAuth);

    if (authBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(authBuffer, expectedBuffer)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabaseAdmin = createAdminClient();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // 1. Fetch active unpaid invoices with a due date
        const { data: invoices, error } = await supabaseAdmin
            .from('invoices')
            .select('*')
            .in('status', ['ISSUED', 'PARTIALLY_PAID'])
            .not('due_date', 'is', null);

        if (error) {
            console.error('[Invoice Reminders Cron] Fetch error:', error);
            return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
        }

        let dueSoonSent = 0;
        let overdueSent = 0;
        let skipped = 0;
        let failed = 0;

        for (const invoice of invoices || []) {
            try {
                const dueDate = new Date(invoice.due_date.includes('T') ? invoice.due_date : `${invoice.due_date}T00:00:00`);
                // Calculate days difference (positive = future, negative = past)
                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 2) {
                    // Due soon reminder (window: within 2 days of due date)
                    const res = await sendInvoiceNotification({
                        supabaseAdmin,
                        invoiceId: invoice.id,
                        notificationType: 'DUE_SOON',
                        channel: 'EMAIL',
                        metadata: {
                            cron_trigger: true,
                            days_until_due: diffDays
                        }
                    });

                    if (res.success) {
                        if (res.skipped) skipped++;
                        else dueSoonSent++;
                    } else {
                        if (res.skipped) skipped++;
                        else failed++;
                    }

                } else if (diffDays < 0) {
                    // Overdue reminder
                    // Check overdue history for this invoice
                    const { data: overdueHistory } = await supabaseAdmin
                        .from('invoice_notifications')
                        .select('id, created_at')
                        .eq('invoice_id', invoice.id)
                        .eq('notification_type', 'OVERDUE')
                        .eq('status', 'SENT')
                        .order('created_at', { ascending: false });

                    const overdueCount = overdueHistory?.length || 0;

                    // Lifetime cap: maximum 3 overdue reminders
                    if (overdueCount >= 3) {
                        skipped++;
                        continue;
                    }

                    // Cadence check: enforce minimum 3-day (72h) gap between consecutive overdue reminders
                    if (overdueHistory && overdueHistory.length > 0) {
                        const lastSentTime = new Date(overdueHistory[0].created_at).getTime();
                        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
                        if (Date.now() - lastSentTime < threeDaysMs) {
                            skipped++;
                            continue;
                        }
                    }

                    const res = await sendInvoiceNotification({
                        supabaseAdmin,
                        invoiceId: invoice.id,
                        notificationType: 'OVERDUE',
                        channel: 'EMAIL',
                        metadata: {
                            cron_trigger: true,
                            days_overdue: Math.abs(diffDays),
                            overdue_reminder_num: (overdueCount || 0) + 1
                        }
                    });

                    if (res.success) {
                        if (res.skipped) skipped++;
                        else overdueSent++;
                    } else {
                        if (res.skipped) skipped++;
                        else failed++;
                    }
                } else {
                    // Due date is far in future
                    skipped++;
                }

                // Minor throttle between sends to prevent burst limits
                await new Promise(r => setTimeout(r, 50));

            } catch (invErr) {
                console.error(`[Invoice Reminders Cron] Error processing invoice ${invoice.id}:`, invErr);
                failed++;
            }
        }

        return NextResponse.json({
            success: true,
            totalProcessed: invoices?.length || 0,
            dueSoonSent,
            overdueSent,
            skipped,
            failed
        });

    } catch (err) {
        console.error('[Invoice Reminders Cron] Unexpected error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
