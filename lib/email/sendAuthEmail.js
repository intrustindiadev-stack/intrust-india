import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import { welcomeEmailTemplate, loginAlertTemplate } from './templates/index.js';

/**
 * lib/email/sendAuthEmail.js
 *
 * Domain email wrapper for Authentication & Security:
 * welcome emails and security login notifications.
 * Validates type, resolves template and trusted sender identity, and dispatches via sendEmail.
 */

const ALLOWED_TYPES = Object.freeze([
    'welcome',
    'login_alert',
]);

// 5-minute in-memory deduplication cache for login security alerts
const recentLoginAlerts = new Map();
const LOGIN_ALERT_COOLDOWN_MS = 5 * 60 * 1000;

function isLoginAlertThrottled(key) {
    if (!key) return false;
    const now = Date.now();
    const lastSent = recentLoginAlerts.get(key);
    if (lastSent && (now - lastSent) < LOGIN_ALERT_COOLDOWN_MS) {
        return true;
    }
    recentLoginAlerts.set(key, now);

    // Prune stale entries
    if (recentLoginAlerts.size > 500) {
        for (const [k, timestamp] of recentLoginAlerts) {
            if (now - timestamp >= LOGIN_ALERT_COOLDOWN_MS) {
                recentLoginAlerts.delete(k);
            }
        }
    }
    return false;
}

/**
 * @param {object} params
 * @param {typeof ALLOWED_TYPES[number]} params.type
 * @param {string|string[]} params.to - Recipient user email
 * @param {object} params.data - Template-specific payload
 * @param {string} [params.actorId] - Initiating user ID
 * @param {Record<string, unknown>} [params.metadata]
 * @returns {Promise<import('./sendEmail.js').SendEmailResult>}
 */
export async function sendAuthEmail({ type, to, data = {}, actorId = null, metadata = {} }) {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        throw new EmailError(
            `Invalid auth email type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
            'ERR_INVALID_EMAIL_TYPE'
        );
    }

    if (!to) {
        throw new EmailError('Recipient email address (to) is required', 'ERR_EMPTY_RECIPIENT');
    }

    // Skip redundant login alert emails within the 5-minute window
    if (type === 'login_alert') {
        const dedupeKey = actorId || (Array.isArray(to) ? to[0] : to);
        if (isLoginAlertThrottled(dedupeKey)) {
            console.log(`[sendAuthEmail] Skipping duplicate login alert for ${to} (sent within 5 min cooldown)`);
            return {
                success: true,
                skipped: true,
                messageId: 'cooldown-skipped',
                category: 'auth_login_alert',
                recipients: Array.isArray(to) ? to : [to],
                sender: 'security'
            };
        }
    }

    let template;
    const sender = 'security';
    let category = 'auth_email';

    switch (type) {
        case 'welcome':
            template = welcomeEmailTemplate(data);
            category = 'auth_welcome';
            break;

        case 'login_alert':
            template = loginAlertTemplate(data);
            category = 'auth_login_alert';
            break;

        default:
            throw new EmailError(`Unhandled auth email type: ${type}`, 'ERR_UNHANDLED_TYPE');
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
