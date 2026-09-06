import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

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

        // 1. Fetch Invoices in Scope
        let invoiceQuery = supabaseAdmin
            .from('invoices')
            .select(`
                id,
                invoice_number,
                invoice_date,
                due_date,
                status,
                grand_total_paise,
                amount_paid_paise,
                created_at,
                paid_at,
                created_by
            `);

        if (!isManagerOrAdmin) {
            invoiceQuery = invoiceQuery.eq('created_by', user.id);
        }

        const { data: invoices, error: invErr } = await invoiceQuery;

        if (invErr) {
            console.error('[Invoice Analytics] Invoice query error:', invErr);
            return NextResponse.json({ error: 'Failed to fetch invoice analytics' }, { status: 500 });
        }

        // Use UTC calendar date for today to prevent server timezone divergence (F-07)
        const now = new Date();
        const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        // 2. Accounts Receivable Aging Buckets
        const aging = {
            current: { count: 0, amount_paise: 0 },
            overdue_1_30: { count: 0, amount_paise: 0 },
            overdue_31_60: { count: 0, amount_paise: 0 },
            overdue_61_90: { count: 0, amount_paise: 0 },
            overdue_90_plus: { count: 0, amount_paise: 0 }
        };

        // 3. Collection Metrics
        let totalInvoicedPaise = 0;
        let totalCollectedPaise = 0;
        let totalOutstandingPaise = 0;
        let totalSettledInvoices = 0;
        let totalSettlementDays = 0;

        for (const inv of invoices || []) {
            const grandTotal = inv.grand_total_paise || 0;
            const amountPaid = inv.amount_paid_paise || 0;
            const balanceDue = Math.max(0, grandTotal - amountPaid);

            if (inv.status !== 'CANCELLED' && inv.status !== 'VOID' && inv.status !== 'DRAFT') {
                totalInvoicedPaise += grandTotal;
                totalCollectedPaise += amountPaid;
            }

            if (inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID') {
                totalOutstandingPaise += balanceDue;

                if (!inv.due_date) {
                    aging.current.count++;
                    aging.current.amount_paise += balanceDue;
                } else {
                    const dueDateStr = typeof inv.due_date === 'string' ? inv.due_date.split('T')[0] : '';
                    const dueDate = new Date(`${dueDateStr}T00:00:00.000Z`);
                    const diffDays = Math.round((dueDate.getTime() - todayUtc.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays >= 0) {
                        aging.current.count++;
                        aging.current.amount_paise += balanceDue;
                    } else {
                        const overdueDays = Math.abs(diffDays);
                        if (overdueDays <= 30) {
                            aging.overdue_1_30.count++;
                            aging.overdue_1_30.amount_paise += balanceDue;
                        } else if (overdueDays <= 60) {
                            aging.overdue_31_60.count++;
                            aging.overdue_31_60.amount_paise += balanceDue;
                        } else if (overdueDays <= 90) {
                            aging.overdue_61_90.count++;
                            aging.overdue_61_90.amount_paise += balanceDue;
                        } else {
                            aging.overdue_90_plus.count++;
                            aging.overdue_90_plus.amount_paise += balanceDue;
                        }
                    }
                }
            } else if (inv.status === 'PAID' && inv.paid_at && inv.invoice_date) {
                // F-07: Deterministic UTC-based days to settle calculation
                const issueDateStr = typeof inv.invoice_date === 'string' ? inv.invoice_date.split('T')[0] : '';
                const issueDate = new Date(`${issueDateStr}T00:00:00.000Z`);
                const paidDate = new Date(inv.paid_at);
                const daysToSettle = Math.max(0, Math.ceil((paidDate.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24)));
                totalSettlementDays += daysToSettle;
                totalSettledInvoices++;
            }
        }

        const collectionRate = totalInvoicedPaise > 0 
            ? Number(((totalCollectedPaise / totalInvoicedPaise) * 100).toFixed(1))
            : 0;

        const avgDaysToSettle = totalSettledInvoices > 0 
            ? Number((totalSettlementDays / totalSettledInvoices).toFixed(1))
            : 0;

        // 4. Notification Health Analytics (F-02: Scalable query without oversized IN clause)
        let notifMetrics = {
            total: 0,
            sent: 0,
            failed: 0,
            skipped: 0,
            pending: 0,
            delivery_rate_percent: 100,
            by_channel: { EMAIL: 0, WHATSAPP: 0 },
            by_type: {}
        };

        let notifQuery = isManagerOrAdmin
            ? supabaseAdmin.from('invoice_notifications').select('notification_type, channel, status')
            : supabaseAdmin
                .from('invoice_notifications')
                .select('notification_type, channel, status, invoices!inner(created_by)')
                .eq('invoices.created_by', user.id);

        const { data: notifs, error: notifErr } = await notifQuery;

        if (notifErr) {
            console.error('[Invoice Analytics] Notification query error:', notifErr);
        } else if (notifs && notifs.length > 0) {
            notifMetrics.total = notifs.length;
            for (const n of notifs) {
                if (n.status === 'SENT') notifMetrics.sent++;
                else if (n.status === 'FAILED') notifMetrics.failed++;
                else if (n.status === 'SKIPPED') notifMetrics.skipped++;
                else if (n.status === 'PENDING') notifMetrics.pending++;

                if (n.channel) {
                    notifMetrics.by_channel[n.channel] = (notifMetrics.by_channel[n.channel] || 0) + 1;
                }

                if (n.notification_type) {
                    notifMetrics.by_type[n.notification_type] = (notifMetrics.by_type[n.notification_type] || 0) + 1;
                }
            }

            const deliverableCount = notifMetrics.sent + notifMetrics.failed;
            notifMetrics.delivery_rate_percent = deliverableCount > 0 
                ? Number(((notifMetrics.sent / deliverableCount) * 100).toFixed(1))
                : 100;
        }

        return NextResponse.json({
            success: true,
            aging,
            collection: {
                total_invoiced_paise: totalInvoicedPaise,
                total_collected_paise: totalCollectedPaise,
                total_outstanding_paise: totalOutstandingPaise,
                collection_rate_percent: collectionRate,
                avg_days_to_settle: avgDaysToSettle,
                total_settled_invoices: totalSettledInvoices
            },
            notifications: notifMetrics
        });

    } catch (err) {
        console.error('[Invoice Analytics] Server error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
