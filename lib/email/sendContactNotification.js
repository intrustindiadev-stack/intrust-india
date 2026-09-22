import 'server-only';
import { sendEmail } from './sendEmail.js';
import { contactNotificationTemplate } from './templates/contactNotification.js';
import { getEmailConfig } from './emailConfig.js';
import { sendAdminWhatsAppNotification } from '@/lib/notifications/adminAlerts.js';

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
    const to = config.adminNotificationEmail || config.contactNotificationEmail || 'kapildubey0626@gmail.com';

    const template = contactNotificationTemplate({
        name,
        email,
        subject,
        message,
        receivedAt: new Date(),
    });

    // Best-effort WhatsApp admin alert for contact inquiries
    try {
        sendAdminWhatsAppNotification({
            title: 'New Contact Form Inquiry',
            details: {
                'Name': name || 'N/A',
                'Email': email || 'N/A',
                'Subject': subject || 'Inquiry',
                'Message': message ? (message.length > 120 ? message.slice(0, 117) + '...' : message) : 'N/A',
            },
        }).catch(err => {
            console.warn('[sendContactNotification:WhatsApp] Non-fatal dispatch error:', err.message);
        });
    } catch (waErr) {
        console.warn('[sendContactNotification:WhatsApp] Could not trigger WhatsApp alert:', waErr.message);
    }

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
