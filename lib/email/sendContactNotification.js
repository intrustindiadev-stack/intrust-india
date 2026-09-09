import 'server-only';
import { sendEmail } from './sendEmail.js';
import { contactNotificationTemplate } from './templates/contactNotification.js';
import { getEmailConfig } from './emailConfig.js';

/**
 * lib/email/sendContactNotification.js
 *
 * Contact-form email notification service.
 * Migrated to route through the centralized InTrust India transactional mail architecture.
 *
 * @param {object} params
 * @param {string} params.name - Submitter name
 * @param {string} params.email - Submitter email
 * @param {string} params.subject - Submitter inquiry subject
 * @param {string} params.message - Submitter message text
 * @returns {Promise<{ success: boolean, messageId: string, category: string, recipients: string[] }>}
 */
export async function sendContactNotification({ name, email, subject, message }) {
    const config = getEmailConfig();
    const to = config.contactNotificationEmail || 'hello@intrustindia.com';

    const template = contactNotificationTemplate({
        name,
        email,
        subject,
        message,
        receivedAt: new Date(),
    });

    return await sendEmail({
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        sender: 'info',
        replyTo: email,
        category: 'contact_notification',
        metadata: {
            submitter_name: name,
            submitter_email: email,
        },
    });
}
