import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import {
    leaveApplicationAdminTemplate,
    candidateHiredWelcomeTemplate,
} from './templates/index.js';

/**
 * lib/email/sendHRMAlert.js
 *
 * Domain email wrapper for Human Resources Management:
 * employee leave requests to HR, candidate hiring and onboarding welcome packets.
 * Validates type, resolves template and trusted sender identity, and dispatches via sendEmail.
 */

const ALLOWED_TYPES = Object.freeze([
    'leave_applied',
    'candidate_hired',
]);

/**
 * @param {object} params
 * @param {typeof ALLOWED_TYPES[number]} params.type
 * @param {string|string[]} params.to - Recipient HR manager or new hire email
 * @param {object} params.data - Template-specific payload
 * @param {string} [params.actorId] - Initiating user ID
 * @param {Record<string, unknown>} [params.metadata]
 * @returns {Promise<import('./sendEmail.js').SendEmailResult>}
 */
export async function sendHRMAlert({ type, to, data = {}, actorId = null, metadata = {} }) {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        throw new EmailError(
            `Invalid HRM alert email type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
            'ERR_INVALID_EMAIL_TYPE'
        );
    }

    if (!to) {
        throw new EmailError('Recipient email address (to) is required', 'ERR_EMPTY_RECIPIENT');
    }

    let template;
    const sender = 'hr';
    let category = 'hrm_alert';

    switch (type) {
        case 'leave_applied':
            template = leaveApplicationAdminTemplate(data);
            category = 'hrm_leave_applied';
            break;

        case 'candidate_hired':
            template = candidateHiredWelcomeTemplate(data);
            category = 'hrm_candidate_hired';
            break;

        default:
            throw new EmailError(`Unhandled HRM alert email type: ${type}`, 'ERR_UNHANDLED_TYPE');
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
