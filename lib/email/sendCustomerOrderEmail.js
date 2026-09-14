import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import {
    orderConfirmedTemplate,
    orderStatusUpdateTemplate,
    udhariDecisionTemplate,
    udhariPaymentReceiptTemplate,
} from './templates/index.js';

/**
 * lib/email/sendCustomerOrderEmail.js
 *
 * Domain email wrapper for Customer Orders, status transitions, and store credit.
 * Validates type, resolves template and trusted sender identity, and dispatches via sendEmail.
 */

const ALLOWED_TYPES = Object.freeze([
    'order_confirmed',
    'order_status_update',
    'udhari_decision',
    'udhari_receipt',
]);

/**
 * @param {object} params
 * @param {'order_confirmed'|'order_status_update'|'udhari_decision'|'udhari_receipt'} params.type
 * @param {string|string[]} params.to - Recipient customer email
 * @param {object} params.data - Template-specific payload
 * @param {string} [params.actorId] - User or system initiating the action
 * @param {Record<string, unknown>} [params.metadata]
 * @returns {Promise<import('./sendEmail.js').SendEmailResult>}
 */
export async function sendCustomerOrderEmail({ type, to, data = {}, actorId = null, metadata = {} }) {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        throw new EmailError(
            `Invalid customer order email type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
            'ERR_INVALID_EMAIL_TYPE'
        );
    }

    if (!to) {
        throw new EmailError('Recipient email address (to) is required', 'ERR_EMPTY_RECIPIENT');
    }

    let template;
    let sender = 'orders';
    let category = 'customer_order';

    switch (type) {
        case 'order_confirmed':
            template = orderConfirmedTemplate(data);
            sender = 'orders';
            category = 'customer_order_confirmed';
            break;

        case 'order_status_update':
            template = orderStatusUpdateTemplate(data);
            sender = 'orders';
            category = 'customer_order_status';
            break;

        case 'udhari_decision':
            template = udhariDecisionTemplate(data);
            sender = 'orders';
            category = 'customer_udhari_decision';
            break;

        case 'udhari_receipt':
            template = udhariPaymentReceiptTemplate(data);
            sender = 'accounts';
            category = 'customer_udhari_receipt';
            break;

        default:
            throw new EmailError(`Unhandled customer order email type: ${type}`, 'ERR_UNHANDLED_TYPE');
    }

    return await sendEmail({
        to,
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
