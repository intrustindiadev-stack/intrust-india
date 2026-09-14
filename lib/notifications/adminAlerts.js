import 'server-only';
import crypto from 'crypto';
import { sendWhatsAppMessage, normalisePhone } from '@/lib/omniflow';
import { createAdminClient } from '@/lib/supabaseServer';

const DEFAULT_ADMIN_EMAIL = 'kapildubey0626@gmail.com';
const DEFAULT_ADMIN_PHONE = '+919755900467';

/**
 * Returns the active admin notification destination coordinates and channel flags.
 * Prioritizes dynamic platform_settings, then environment variables, then system defaults.
 */
export async function getAdminNotificationSettings() {
    let email = process.env.ADMIN_NOTIFICATION_EMAIL || DEFAULT_ADMIN_EMAIL;
    let phone = process.env.ADMIN_NOTIFICATION_PHONE || DEFAULT_ADMIN_PHONE;
    let whatsappEnabled = true;
    let emailEnabled = true;

    try {
        const supabase = createAdminClient();
        const { data: settings } = await supabase
            .from('platform_settings')
            .select('key, value')
            .in('key', [
                'admin_notification_email',
                'admin_notification_phone',
                'admin_whatsapp_alerts_enabled',
                'admin_email_alerts_enabled',
            ]);

        if (settings && Array.isArray(settings)) {
            const map = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
            if (map.admin_notification_email) email = map.admin_notification_email.trim();
            if (map.admin_notification_phone) phone = map.admin_notification_phone.trim();
            if (map.admin_whatsapp_alerts_enabled !== undefined) {
                whatsappEnabled = map.admin_whatsapp_alerts_enabled === 'true' || map.admin_whatsapp_alerts_enabled === true;
            }
            if (map.admin_email_alerts_enabled !== undefined) {
                emailEnabled = map.admin_email_alerts_enabled === 'true' || map.admin_email_alerts_enabled === true;
            }
        }
    } catch (err) {
        console.warn('[AdminAlerts] Warning loading platform_settings, using fallback env:', err.message);
    }

    return {
        email,
        phone,
        whatsappEnabled,
        emailEnabled,
    };
}

/**
 * Sends a real-time WhatsApp alert to the dedicated admin phone number.
 * Best-effort: failures are recorded in whatsapp_message_logs and logged without throwing.
 *
 * @param {object} params
 * @param {string} params.title - Alert title or category header
 * @param {Record<string, string|number>} [params.details] - Key-value pairs of details
 * @param {string} [params.customMessage] - Optional custom message string overriding automatic formatting
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
export async function sendAdminWhatsAppNotification({ title, details = {}, customMessage = null }) {
    try {
        const config = await getAdminNotificationSettings();
        if (!config.whatsappEnabled) {
            console.log('[AdminAlerts:WhatsApp] Admin WhatsApp notifications are currently disabled.');
            return { success: false, error: 'Disabled' };
        }

        const phone = config.phone;
        if (!phone) {
            console.warn('[AdminAlerts:WhatsApp] No admin notification phone configured.');
            return { success: false, error: 'No phone configured' };
        }

        const normalisedPhone = normalisePhone(phone);
        const timestamp = new Intl.DateTimeFormat('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date());

        let text = customMessage;
        if (!text) {
            const detailLines = Object.entries(details)
                .filter(([_, v]) => v !== undefined && v !== null && v !== '')
                .map(([k, v]) => `• *${k}:* ${v}`)
                .join('\n');

            text = `🔔 *InTrust India Admin Alert*\n\n` +
                   `📌 *${title || 'System Notification'}*\n` +
                   (detailLines ? `${detailLines}\n` : '') +
                   `\n⏰ *Time (IST):* ${timestamp}`;
        }

        const phoneHash = crypto.createHash('sha256').update(normalisedPhone).digest('hex');
        const adminClient = createAdminClient();

        try {
            const res = await sendWhatsAppMessage(normalisedPhone, text);

            // Audit log
            try {
                await adminClient.from('whatsapp_message_logs').insert({
                    phone_hash: phoneHash,
                    recipient_phone_e164: normalisedPhone,
                    direction: 'outbound',
                    message_type: 'admin_alert',
                    channel: 'whatsapp',
                    audience: 'admin',
                    status: 'sent',
                    wamid: res?.messageId || null,
                    content_preview: text.slice(0, 150),
                    sent_at: new Date().toISOString(),
                });
            } catch (logErr) {
                console.warn('[AdminAlerts:WhatsApp] Failed to write message log:', logErr.message);
            }

            return { success: true, messageId: res?.messageId };
        } catch (sendErr) {
            console.error('[AdminAlerts:WhatsApp] Omniflow dispatch failed:', sendErr.message);

            try {
                await adminClient.from('whatsapp_message_logs').insert({
                    phone_hash: phoneHash,
                    recipient_phone_e164: normalisedPhone,
                    direction: 'outbound',
                    message_type: 'admin_alert',
                    channel: 'whatsapp',
                    audience: 'admin',
                    status: 'failed',
                    content_preview: `[FAILED] ${text.slice(0, 120)}`,
                    error_message: sendErr.message,
                    failed_at: new Date().toISOString(),
                });
            } catch (logErr) {
                console.warn('[AdminAlerts:WhatsApp] Failed to write failure log:', logErr.message);
            }

            return { success: false, error: sendErr.message };
        }
    } catch (err) {
        console.error('[AdminAlerts:WhatsApp] Unexpected error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Unified helper to dispatch both Email and WhatsApp notifications to the admin.
 * Non-blocking: failures in either channel do not throw or disrupt caller.
 *
 * @param {object} params
 * @param {'new_merchant_application'|'payout_needed'|'new_order'|'vault_withdrawal'|'contact_form'} params.type
 * @param {string} [params.title]
 * @param {Record<string, any>} [params.data] - Email template payload
 * @param {Record<string, string|number>} [params.whatsappDetails] - Key-value pairs for WhatsApp message
 * @param {string} [params.actorId]
 * @param {Record<string, any>} [params.metadata]
 */
export async function notifyAdmin({
    type,
    title,
    data = {},
    whatsappDetails = {},
    actorId = null,
    metadata = {},
}) {
    const settings = await getAdminNotificationSettings();

    // 1. Email Alert
    if (settings.emailEnabled && type !== 'contact_form') {
        import('@/lib/email/sendAdminAlert').then(({ sendAdminAlert }) => {
            sendAdminAlert({
                type,
                to: settings.email,
                data,
                actorId,
                metadata,
            }).catch(err => {
                console.error(`[AdminAlerts:Email] Failed for ${type}:`, err.message);
            });
        }).catch(err => {
            console.error('[AdminAlerts:Email] Module import failed:', err.message);
        });
    }

    // 2. WhatsApp Alert
    if (settings.whatsappEnabled) {
        let alertTitle = title;
        if (!alertTitle) {
            switch (type) {
                case 'new_order':
                    alertTitle = 'New Shopping Order Placed';
                    break;
                case 'payout_needed':
                    alertTitle = 'Merchant Payout Request Needed';
                    break;
                case 'new_merchant_application':
                    alertTitle = 'New Merchant Application Received';
                    break;
                case 'vault_withdrawal':
                    alertTitle = 'AI Order Vault Withdrawal Request';
                    break;
                case 'contact_form':
                    alertTitle = 'New Contact Form Inquiry';
                    break;
                default:
                    alertTitle = 'Platform Admin Alert';
            }
        }

        sendAdminWhatsAppNotification({
            title: alertTitle,
            details: whatsappDetails,
        }).catch(err => {
            console.error(`[AdminAlerts:WhatsApp] Background task failed:`, err.message);
        });
    }
}
