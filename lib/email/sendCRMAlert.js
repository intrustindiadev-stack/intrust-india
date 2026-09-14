import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import {
    leadAssignedTemplate,
    leadConvertedTemplate,
    taskAssignedTemplate,
} from './templates/index.js';

/**
 * lib/email/sendCRMAlert.js
 *
 * Domain email wrapper for CRM & Territory Sales:
 * lead assignments, conversion milestones, and task schedules.
 * Validates type, resolves template and trusted sender identity, and dispatches via sendEmail.
 */

const ALLOWED_TYPES = Object.freeze([
    'lead_assigned',
    'lead_converted',
    'task_assigned',
]);

/**
 * @param {object} params
 * @param {typeof ALLOWED_TYPES[number]} params.type
 * @param {string|string[]} params.to - Recipient sales representative email
 * @param {object} params.data - Template-specific payload
 * @param {string} [params.actorId] - Initiating user ID
 * @param {Record<string, unknown>} [params.metadata]
 * @returns {Promise<import('./sendEmail.js').SendEmailResult>}
 */
export async function sendCRMAlert({ type, to, data = {}, actorId = null, metadata = {} }) {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        throw new EmailError(
            `Invalid CRM alert email type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
            'ERR_INVALID_EMAIL_TYPE'
        );
    }

    if (!to) {
        throw new EmailError('Recipient email address (to) is required', 'ERR_EMPTY_RECIPIENT');
    }

    let template;
    const sender = 'notifications';
    let category = 'crm_alert';

    switch (type) {
        case 'lead_assigned':
            template = leadAssignedTemplate(data);
            category = 'crm_lead_assigned';
            break;

        case 'lead_converted':
            template = leadConvertedTemplate(data);
            category = 'crm_lead_converted';
            break;

        case 'task_assigned':
            template = taskAssignedTemplate(data);
            category = 'crm_task_assigned';
            break;

        default:
            throw new EmailError(`Unhandled CRM alert email type: ${type}`, 'ERR_UNHANDLED_TYPE');
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
