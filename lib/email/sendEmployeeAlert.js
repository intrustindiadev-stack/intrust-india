import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import {
    leaveDecisionTemplate,
    salaryProcessedTemplate,
} from './templates/index.js';

/**
 * lib/email/sendEmployeeAlert.js
 *
 * Domain email wrapper for Employee communications:
 * leave approvals/rejections and processed payslips.
 * Validates type, resolves template and trusted sender identity, and dispatches via sendEmail.
 */

const ALLOWED_TYPES = Object.freeze([
    'leave_decision',
    'salary_processed',
]);

/**
 * @param {object} params
 * @param {typeof ALLOWED_TYPES[number]} params.type
 * @param {string|string[]} params.to - Recipient employee email
 * @param {object} params.data - Template-specific payload
 * @param {string} [params.actorId] - Initiating user ID
 * @param {Record<string, unknown>} [params.metadata]
 * @returns {Promise<import('./sendEmail.js').SendEmailResult>}
 */
export async function sendEmployeeAlert({ type, to, data = {}, actorId = null, metadata = {} }) {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        throw new EmailError(
            `Invalid employee alert email type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
            'ERR_INVALID_EMAIL_TYPE'
        );
    }

    if (!to) {
        throw new EmailError('Recipient email address (to) is required', 'ERR_EMPTY_RECIPIENT');
    }

    let template;
    let sender = 'hr';
    let category = 'employee_alert';

    switch (type) {
        case 'leave_decision':
            template = leaveDecisionTemplate(data);
            sender = 'hr';
            category = 'employee_leave_decision';
            break;

        case 'salary_processed':
            template = salaryProcessedTemplate(data);
            sender = 'accounts';
            category = 'employee_salary_processed';
            break;

        default:
            throw new EmailError(`Unhandled employee alert email type: ${type}`, 'ERR_UNHANDLED_TYPE');
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
