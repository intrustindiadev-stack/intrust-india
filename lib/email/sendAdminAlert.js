import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import {
    newMerchantApplicationAlertTemplate,
    newPayoutRequestAlertTemplate,
    newOrderPlatformAlertTemplate,
    aiOrderWithdrawalNotificationTemplate,
} from './templates/index.js';
import { getEmailConfig } from './emailConfig.js';
import { sendAdminWhatsAppNotification } from '@/lib/notifications/adminAlerts.js';

/**
 * lib/email/sendAdminAlert.js
 *
 * Domain email wrapper for Administrative alerts:
 * new merchant applications, payout requests, high-value orders, and vault withdrawals.
 * Validates type, resolves template and trusted sender identity, and dispatches via sendEmail.
 */

const ALLOWED_TYPES = Object.freeze([
    'new_merchant_application',
    'payout_needed',
    'new_order',
    'vault_withdrawal',
]);

/**
 * @param {object} params
 * @param {typeof ALLOWED_TYPES[number]} params.type
 * @param {string|string[]} [params.to] - Optional override; defaults to ADMIN_NOTIFICATION_EMAIL / hello@intrustindia.com
 * @param {object} params.data - Template-specific payload
 * @param {string} [params.actorId] - Initiating user ID
 * @param {Record<string, unknown>} [params.metadata]
 * @returns {Promise<import('./sendEmail.js').SendEmailResult>}
 */
export async function sendAdminAlert({ type, to, data = {}, actorId = null, metadata = {} }) {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        throw new EmailError(
            `Invalid admin alert email type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
            'ERR_INVALID_EMAIL_TYPE'
        );
    }

    const config = getEmailConfig();
    const recipient = to || config.adminNotificationEmail || process.env.ADMIN_NOTIFICATION_EMAIL || config.contactNotificationEmail || 'kapildubey0626@gmail.com';

    let template;
    let sender = 'notifications';
    let category = 'admin_alert';

    switch (type) {
        case 'new_merchant_application':
            template = newMerchantApplicationAlertTemplate(data);
            sender = 'notifications';
            category = 'admin_merchant_application';
            break;

        case 'payout_needed':
            template = newPayoutRequestAlertTemplate(data);
            sender = 'accounts';
            category = 'admin_payout_needed';
            break;

        case 'new_order':
            template = newOrderPlatformAlertTemplate(data);
            sender = 'notifications';
            category = 'admin_new_order';
            break;

        case 'vault_withdrawal':
            template = aiOrderWithdrawalNotificationTemplate(data);
            sender = 'accounts';
            category = 'admin_vault_withdrawal';
            break;

        default:
            throw new EmailError(`Unhandled admin alert email type: ${type}`, 'ERR_UNHANDLED_TYPE');
    }

    // Trigger real-time WhatsApp alert to dedicated admin number (best effort)
    try {
        let waTitle = 'Admin Alert';
        let waDetails = {};

        switch (type) {
            case 'new_merchant_application':
                waTitle = 'New Merchant Application Received';
                waDetails = {
                    'Business': data.businessName || 'N/A',
                    'Owner': data.ownerName || 'N/A',
                    'Phone': data.phone || 'N/A',
                    'Email': data.email || 'N/A',
                    'App ID': data.applicationId || 'N/A',
                };
                break;
            case 'payout_needed':
                waTitle = 'Merchant Payout Requested';
                waDetails = {
                    'Merchant': data.merchantName || 'N/A',
                    'Amount': `₹${data.amountRs || 0}`,
                    'Request ID': data.requestId || 'N/A',
                    'Source': data.source || 'N/A',
                };
                break;
            case 'new_order':
                waTitle = 'New Shopping Order Placed';
                waDetails = {
                    'Order ID': data.orderShortId || 'N/A',
                    'Amount': `₹${data.amountRs || 0}`,
                    'Customer': data.customerName || 'Customer',
                };
                break;
            case 'vault_withdrawal':
                waTitle = 'AI Order Vault Withdrawal Request';
                waDetails = {
                    'Merchant': data.merchantName || 'N/A',
                    'Amount': `₹${data.amountRs || 0}`,
                    'Vault ID': data.vaultId || 'N/A',
                };
                break;
        }

        sendAdminWhatsAppNotification({
            title: waTitle,
            details: waDetails,
        }).catch(err => {
            console.warn('[sendAdminAlert:WhatsApp] Non-fatal dispatch error:', err.message);
        });
    } catch (waErr) {
        console.warn('[sendAdminAlert:WhatsApp] Could not trigger WhatsApp alert:', waErr.message);
    }

    return await sendEmail({
        to: recipient,
        subject: template.subject,
        html: template.html,
        text: template.text,
        sender,
        category,
        metadata: {
            ...metadata,
            actorId,
            type,
        },
    });
}
