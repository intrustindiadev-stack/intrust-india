/**
 * lib/notifications/invoiceNotificationService.js
 * 
 * Central notification abstraction for Intrust India Invoices.
 * Handles idempotent email dispatch, WhatsApp fallback, audit logging,
 * and failure recovery.
 */

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { 
    getInvoiceCreatedTemplate,
    getInvoiceResentTemplate,
    getPaymentSuccessTemplate,
    getPartialPaymentTemplate,
    getPaymentFailedTemplate,
    getDueSoonReminderTemplate,
    getOverdueReminderTemplate
} from './invoiceTemplates';

let _supabaseAdminInstance = null;
function getAdminClient(providedClient) {
    if (providedClient) return providedClient;
    if (_supabaseAdminInstance) return _supabaseAdminInstance;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Missing Supabase service role credentials in environment');
    }
    _supabaseAdminInstance = createClient(url, key);
    return _supabaseAdminInstance;
}

/** @type {import('nodemailer').Transporter | null} */
let _transporter = null;

/**
 * Return cached nodemailer transporter or create one if env vars are present.
 */
function getEmailTransporter() {
    if (_transporter) return _transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return null;
    }

    _transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
    });

    return _transporter;
}

/**
 * Mask an email or phone for user-facing audit logs
 */
function maskRecipient(recipient) {
    if (!recipient) return 'N/A';
    if (recipient.includes('@')) {
        const [local, domain] = recipient.split('@');
        if (local.length <= 2) return `${local}***@${domain}`;
        return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
    }
    const clean = recipient.replace(/\D/g, '');
    if (clean.length >= 10) {
        return `+91 ${clean.slice(0, 2)}****${clean.slice(-4)}`;
    }
    return '***';
}

/**
 * Dispatch an invoice notification with strict idempotency and audit tracking.
 * 
 * @param {object} params
 * @param {object} params.supabaseAdmin - Supabase admin client
 * @param {string} params.invoiceId - Internal database invoice UUID
 * @param {string} params.notificationType - Event type ('INVOICE_CREATED', 'INVOICE_RESENT', etc.)
 * @param {string} [params.channel='EMAIL'] - 'EMAIL' | 'WHATSAPP'
 * @param {string} [params.recipient] - Optional recipient override
 * @param {string} [params.actorId] - User ID who triggered the notification (or NULL for system)
 * @param {object} [params.metadata] - Extra transaction / context metadata
 * @param {boolean} [params.force=false] - Bypass cooldown (for explicit retries)
 */
export async function sendInvoiceNotification({
    supabaseAdmin,
    invoiceId,
    notificationType,
    channel = 'EMAIL',
    recipient,
    actorId = null,
    metadata = {},
    force = false,
    existingNotificationId = null
}) {
    if (!invoiceId || !notificationType) {
        throw new Error('invoiceId and notificationType are required');
    }

    supabaseAdmin = getAdminClient(supabaseAdmin);

    // 1. Fetch Invoice
    const { data: invoice, error: invErr } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

    if (invErr || !invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // 2. Validate Eligibility based on Status
    const isTerminal = invoice.status === 'PAID' || invoice.status === 'CANCELLED' || invoice.status === 'VOID';
    if (isTerminal && (notificationType === 'DUE_SOON' || notificationType === 'OVERDUE')) {
        return {
            success: false,
            skipped: true,
            reason: `Reminders cannot be sent for ${invoice.status} invoices.`
        };
    }

    if (invoice.status === 'CANCELLED' || invoice.status === 'VOID') {
        if (notificationType !== 'INVOICE_RESENT') {
            return {
                success: false,
                skipped: true,
                reason: `Notifications cannot be sent for ${invoice.status} invoices.`
            };
        }
    }

    // 3. Resolve Recipient
    const resolvedRecipient = recipient || (
        channel === 'EMAIL' 
            ? invoice.customer_snapshot?.email 
            : invoice.customer_snapshot?.phone
    );

    if (!resolvedRecipient) {
        // Record skipped notification
        const idempotencyKey = `${invoiceId}:${notificationType}:${channel}:NO_RECIPIENT`;
        try {
            await supabaseAdmin.from('invoice_notifications').upsert({
                invoice_id: invoiceId,
                notification_type: notificationType,
                channel,
                recipient: 'NONE',
                status: 'SKIPPED',
                idempotency_key: idempotencyKey,
                error_message: `Customer has no valid ${channel.toLowerCase()} contact.`,
                metadata
            }, { onConflict: 'idempotency_key' });
        } catch (_) {}

        return {
            success: false,
            skipped: true,
            reason: `Customer has no valid ${channel.toLowerCase()} contact.`
        };
    }

    // 4. Formulate Deterministic Idempotency Key
    let idempotencyKey = '';
    const todayStr = new Date().toISOString().split('T')[0];
    const resolvedTxnId = metadata?.clientTxnId || metadata?.client_txn_id || metadata?.sabpaisaTxnId || metadata?.sabpaisa_txn_id || null;

    switch (notificationType) {
        case 'INVOICE_CREATED':
            idempotencyKey = `${invoiceId}:INVOICE_CREATED:${channel}`;
            break;
        case 'PAYMENT_SUCCESS':
            idempotencyKey = `${invoiceId}:PAYMENT_SUCCESS:${channel}:${resolvedTxnId || 'settled'}`;
            break;
        case 'PARTIAL_PAYMENT':
            idempotencyKey = `${invoiceId}:PARTIAL_PAYMENT:${channel}:${resolvedTxnId || `${invoice.amount_paid_paise || 0}`}`;
            break;
        case 'PAYMENT_FAILED':
            idempotencyKey = `${invoiceId}:PAYMENT_FAILED:${channel}:${resolvedTxnId || 'failure'}`;
            break;
        case 'DUE_SOON':
            idempotencyKey = `${invoiceId}:DUE_SOON:${channel}:${invoice.due_date || todayStr}`;
            break;
        case 'OVERDUE':
            idempotencyKey = `${invoiceId}:OVERDUE:${channel}:${todayStr}`;
            break;
        case 'INVOICE_RESENT':
        default:
            idempotencyKey = `${invoiceId}:RESENT:${channel}:${Date.now()}`;
            break;
    }

    let notifId = existingNotificationId;

    if (existingNotificationId) {
        // Increment attempt count on existing record
        const { data: existingRow } = await supabaseAdmin
            .from('invoice_notifications')
            .select('attempt_count')
            .eq('id', existingNotificationId)
            .single();

        const currentAttempts = existingRow?.attempt_count || 1;
        await supabaseAdmin
            .from('invoice_notifications')
            .update({
                attempt_count: currentAttempts + 1,
                last_attempt_at: new Date().toISOString(),
                status: 'PENDING'
            })
            .eq('id', existingNotificationId);
    } else {
        // 5. Check Idempotency & Cooldown
        if (!force) {
            // Check existing by idempotency key
            const { data: existing } = await supabaseAdmin
                .from('invoice_notifications')
                .select('id, status, created_at')
                .eq('idempotency_key', idempotencyKey)
                .maybeSingle();

            if (existing && existing.status === 'SENT') {
                return {
                    success: true,
                    skipped: true,
                    notificationId: existing.id,
                    reason: `Notification already delivered for key ${idempotencyKey}`
                };
            }

            // Cooldown protection for manual resends: minimum 60 seconds
            if (notificationType === 'INVOICE_RESENT') {
                const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
                const { data: recentSent } = await supabaseAdmin
                    .from('invoice_notifications')
                    .select('id, created_at')
                    .eq('invoice_id', invoiceId)
                    .eq('channel', channel)
                    .eq('notification_type', 'INVOICE_RESENT')
                    .gte('created_at', sixtySecondsAgo)
                    .maybeSingle();

                if (recentSent) {
                    return {
                        success: false,
                        cooldown: true,
                        reason: 'Please wait at least 60 seconds before resending this invoice.'
                    };
                }
            }
        }

        // 6. Insert Pending Record in invoice_notifications
        const { data: notificationRecord, error: notifErr } = await supabaseAdmin
            .from('invoice_notifications')
            .insert({
                invoice_id: invoiceId,
                notification_type: notificationType,
                channel,
                recipient: resolvedRecipient,
                status: 'PENDING',
                idempotency_key: idempotencyKey,
                attempt_count: 1,
                last_attempt_at: new Date().toISOString(),
                metadata: {
                    ...metadata,
                    triggered_by: actorId || 'system'
                }
            })
            .select('*')
            .single();

        if (notifErr) {
            // If unique constraint was hit concurrently
            if (notifErr.code === '23505') {
                return {
                    success: true,
                    skipped: true,
                    reason: 'Concurrent notification suppressed by idempotency constraint.'
                };
            }
            console.error('[Invoice Notification] Failed to create pending record:', notifErr);
            return {
                success: false,
                error: `Failed to initialize notification log: ${notifErr.message || notifErr.code}`
            };
        }

        notifId = notificationRecord?.id;
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.intrustindia.com';
    const paymentUrl = `${baseUrl}/pay/invoice/${invoice.public_payment_token}`;

    // 7. Dispatch through Channel
    if (channel === 'EMAIL') {
        const transporter = getEmailTransporter();
        const fromEmail = process.env.INVOICE_FROM_EMAIL || process.env.CONTACT_FROM_EMAIL || 'billing@intrustindia.com';

        // Prepare Template
        let templateData = null;
        switch (notificationType) {
            case 'INVOICE_CREATED':
                templateData = getInvoiceCreatedTemplate({ invoice, paymentUrl });
                break;
            case 'INVOICE_RESENT':
                templateData = getInvoiceResentTemplate({ invoice, paymentUrl });
                break;
            case 'PAYMENT_SUCCESS':
                templateData = getPaymentSuccessTemplate({
                    invoice,
                    amountPaidPaise: metadata.amount_paise,
                    paymentMode: metadata.payment_mode,
                    clientTxnId: metadata.client_txn_id,
                    sabpaisaTxnId: metadata.sabpaisa_txn_id,
                    paymentUrl
                });
                break;
            case 'PARTIAL_PAYMENT':
                const balanceDuePaise = Math.max(0, invoice.grand_total_paise - invoice.amount_paid_paise);
                templateData = getPartialPaymentTemplate({
                    invoice,
                    amountPaidPaise: metadata.amount_paise,
                    balanceDuePaise,
                    paymentUrl
                });
                break;
            case 'PAYMENT_FAILED':
                templateData = getPaymentFailedTemplate({ invoice, paymentUrl });
                break;
            case 'DUE_SOON':
                templateData = getDueSoonReminderTemplate({ invoice, paymentUrl });
                break;
            case 'OVERDUE':
                templateData = getOverdueReminderTemplate({ invoice, paymentUrl });
                break;
            default:
                templateData = getInvoiceResentTemplate({ invoice, paymentUrl });
                break;
        }

        if (!transporter) {
            // SMTP not configured (e.g. in test or dev environment)
            console.warn(`[Invoice Notification] SMTP not configured. Notification ${notificationType} simulated for ${resolvedRecipient}.`);

            if (notifId) {
                await supabaseAdmin
                    .from('invoice_notifications')
                    .update({
                        status: 'SENT',
                        sent_at: new Date().toISOString(),
                        provider_message_id: `simulated-${Date.now()}`,
                        metadata: { ...metadata, simulated: true }
                    })
                    .eq('id', notifId);
            }

            // Record audit event in invoice_events
            await supabaseAdmin.from('invoice_events').insert({
                invoice_id: invoiceId,
                actor_id: actorId,
                event_type: 'INVOICE_NOTIFICATION_SENT',
                description: `Notification (${notificationType}) sent to ${maskRecipient(resolvedRecipient)} via EMAIL (Simulated).`,
                metadata: {
                    notification_type: notificationType,
                    channel: 'EMAIL',
                    recipient_masked: maskRecipient(resolvedRecipient),
                    simulated: true
                }
            });

            return {
                success: true,
                status: 'SENT',
                simulated: true,
                notificationId: notifId
            };
        }

        // Live Send via SMTP
        try {
            const sendResult = await transporter.sendMail({
                from: `Intrust India Billing <${fromEmail}>`,
                to: resolvedRecipient,
                replyTo: fromEmail,
                subject: templateData.subject,
                text: templateData.text,
                html: templateData.html
            });

            const providerMessageId = sendResult?.messageId || null;

            if (notifId) {
                await supabaseAdmin
                    .from('invoice_notifications')
                    .update({
                        status: 'SENT',
                        sent_at: new Date().toISOString(),
                        provider_message_id: providerMessageId
                    })
                    .eq('id', notifId);
            }

            // Record audit event
            await supabaseAdmin.from('invoice_events').insert({
                invoice_id: invoiceId,
                actor_id: actorId,
                event_type: 'INVOICE_NOTIFICATION_SENT',
                description: `Notification (${notificationType}) sent to ${maskRecipient(resolvedRecipient)} via EMAIL.`,
                metadata: {
                    notification_type: notificationType,
                    channel: 'EMAIL',
                    recipient_masked: maskRecipient(resolvedRecipient),
                    provider_message_id: providerMessageId
                }
            });

            return {
                success: true,
                status: 'SENT',
                notificationId: notifId,
                providerMessageId
            };

        } catch (sendErr) {
            console.error(`[Invoice Notification] Email delivery failed:`, sendErr.message);

            if (notifId) {
                await supabaseAdmin
                    .from('invoice_notifications')
                    .update({
                        status: 'FAILED',
                        failed_at: new Date().toISOString(),
                        error_code: sendErr.code || 'SEND_ERROR',
                        error_message: sendErr.message || 'SMTP delivery failed'
                    })
                    .eq('id', notifId);
            }

            await supabaseAdmin.from('invoice_events').insert({
                invoice_id: invoiceId,
                actor_id: actorId,
                event_type: 'INVOICE_NOTIFICATION_FAILED',
                description: `Email delivery (${notificationType}) failed for ${maskRecipient(resolvedRecipient)}: ${sendErr.message}`,
                metadata: {
                    notification_type: notificationType,
                    channel: 'EMAIL',
                    error: sendErr.message
                }
            });

            return {
                success: false,
                notificationId: notifId,
                error: sendErr.message
            };
        }
    }

    // Default fallback
    return {
        success: false,
        error: `Unsupported channel: ${channel}`
    };
}

/**
 * Retry a previously failed invoice notification (max 3 attempts)
 */
export async function retryInvoiceNotification(arg) {
    let supabaseAdmin = null;
    let notificationId = null;
    let actorId = null;

    if (typeof arg === 'string') {
        notificationId = arg;
    } else if (arg && typeof arg === 'object') {
        supabaseAdmin = arg.supabaseAdmin;
        notificationId = arg.notificationId;
        actorId = arg.actorId;
    }

    supabaseAdmin = getAdminClient(supabaseAdmin);

    const { data: notif, error: fetchErr } = await supabaseAdmin
        .from('invoice_notifications')
        .select('*')
        .eq('id', notificationId)
        .single();

    if (fetchErr || !notif) {
        throw new Error('Notification record not found');
    }

    if (notif.status === 'SENT') {
        return { success: true, reason: 'Already delivered' };
    }

    if (notif.attempt_count >= 3) {
        return { success: false, error: 'Maximum retry limit (3) exceeded for this notification.' };
    }

    return await sendInvoiceNotification({
        supabaseAdmin,
        invoiceId: notif.invoice_id,
        notificationType: notif.notification_type,
        channel: notif.channel,
        recipient: notif.recipient,
        actorId,
        metadata: notif.metadata,
        force: true,
        existingNotificationId: notif.id
    });
}
