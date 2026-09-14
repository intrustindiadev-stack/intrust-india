import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import {
    newMerchantApplicationAlertTemplate,
    newPayoutRequestAlertTemplate,
    newOrderPlatformAlertTemplate,
    aiOrderWithdrawalNotificationTemplate,
} from './templates/index.js';
import { getEmailConfig } from './emailConfig.js';

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
    const recipient = to || process.env.ADMIN_NOTIFICATION_EMAIL || config.contactNotificationEmail || 'hello@intrustindia.com';

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
