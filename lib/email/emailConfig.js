import 'server-only';

/**
 * lib/email/emailConfig.js
 *
 * Central configuration loader and validator for InTrust India's transactional email service.
 * Server-only execution. Never exposed to browser or client bundles.
 */

const DEFAULT_SMTP_PORT = 587;

/**
 * Centralized, trusted sender identities for InTrust India.
 * All identities share the hello@intrustindia.com mailbox credentials via SMTP.
 */
export const EMAIL_SENDERS = Object.freeze({
    default: {
        email: 'hello@intrustindia.com',
        name: 'InTrust India',
    },
    info: {
        email: 'info@intrustindia.com',
        name: 'InTrust India',
    },
    support: {
        email: 'support@intrustindia.com',
        name: 'InTrust India Support',
    },
    accounts: {
        email: 'accounts@intrustindia.com',
        name: 'InTrust India Accounts',
    },
    hr: {
        email: 'hr@intrustindia.com',
        name: 'InTrust India HR',
    },
    orders: {
        email: 'orders@intrustindia.com',
        name: 'InTrust India Orders',
    },
    notifications: {
        email: 'notifications@intrustindia.com',
        name: 'InTrust India',
    },
    security: {
        email: 'security@intrustindia.com',
        name: 'InTrust India Security',
    },
});

export const ALLOWED_SENDER_KEYS = Object.freeze(Object.keys(EMAIL_SENDERS));

/**
 * Check whether a sender identity key exists in the server allowlist.
 *
 * @param {unknown} key
 * @returns {boolean}
 */
export function isValidSenderKey(key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(EMAIL_SENDERS, key);
}

const DEFAULT_SENDER_EMAIL = EMAIL_SENDERS.default.email;
const DEFAULT_SENDER_NAME = EMAIL_SENDERS.default.name;

/**
 * Resolve a sender identity from a valid key.
 * For 'default' (or nullish), respects env overrides (MAIL_FROM_EMAIL / MAIL_FROM_NAME)
 * while defaulting to hello@intrustindia.com.
 *
 * @param {string} [senderKey='default']
 * @returns {{ key: string, email: string, name: string, formatted: string }}
 */
export function resolveSenderIdentity(senderKey = 'default') {
    const key = senderKey || 'default';
    if (!isValidSenderKey(key)) {
        const error = new Error(`Invalid sender identity key: "${senderKey}". Allowed keys: ${ALLOWED_SENDER_KEYS.join(', ')}`);
        error.code = 'ERR_INVALID_SENDER_IDENTITY';
        error.allowedKeys = ALLOWED_SENDER_KEYS;
        throw error;
    }

    const config = getEmailConfig();
    if (key === 'default') {
        const email = config.fromEmail || EMAIL_SENDERS.default.email;
        const name = config.fromName || EMAIL_SENDERS.default.name;
        return {
            key: 'default',
            email,
            name,
            formatted: `${name} <${email}>`,
        };
    }

    const target = EMAIL_SENDERS[key];
    return {
        key,
        email: target.email,
        name: target.name,
        formatted: `${target.name} <${target.email}>`,
    };
}

/**
 * Return resolved email and SMTP configuration from environment variables.
 * Provides backwards compatibility for legacy CONTACT_* variables.
 *
 * @returns {object}
 */
export function getEmailConfig() {
    const rawPort = process.env.SMTP_PORT;
    const parsedPort = rawPort ? parseInt(rawPort, 10) : DEFAULT_SMTP_PORT;
    const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_SMTP_PORT;

    const rawSecure = process.env.SMTP_SECURE;
    // Port 465 is implicit TLS/SSL; otherwise check explicit boolean flag
    const secure = port === 465 ? true : rawSecure === 'true';

    const host = (process.env.SMTP_HOST || '').trim();
    const user = (process.env.SMTP_USER || '').trim();
    const pass = process.env.SMTP_PASS || '';

    // Sender identity: prioritize MAIL_FROM_EMAIL, fallback to CONTACT_FROM_EMAIL, then default
    const fromEmail = (
        process.env.MAIL_FROM_EMAIL ||
        process.env.CONTACT_FROM_EMAIL ||
        DEFAULT_SENDER_EMAIL
    ).trim();

    const fromName = (
        process.env.MAIL_FROM_NAME ||
        DEFAULT_SENDER_NAME
    ).trim();

    // Default reply-to fallback
    const replyTo = (
        process.env.MAIL_REPLY_TO ||
        fromEmail ||
        DEFAULT_SENDER_EMAIL
    ).trim();

    // Notification inbox for contact form submissions
    const contactNotificationEmail = (
        process.env.CONTACT_NOTIFICATION_EMAIL ||
        fromEmail ||
        DEFAULT_SENDER_EMAIL
    ).trim();

    return {
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
        fromEmail,
        fromName,
        replyTo,
        contactNotificationEmail,
        timeouts: {
            connectionTimeout: 10000, // 10s
            greetingTimeout: 10000,   // 10s
            socketTimeout: 15000,     // 15s
        },
    };
}

/**
 * Validate that mandatory SMTP connection credentials exist.
 * Throws a clean error without disclosing secret values.
 *
 * @param {ReturnType<typeof getEmailConfig>} [config]
 * @returns {ReturnType<typeof getEmailConfig>}
 */
export function validateEmailConfig(config = getEmailConfig()) {
    const missing = [];
    if (!config.host) missing.push('SMTP_HOST');
    if (!config.auth.user) missing.push('SMTP_USER');
    if (!config.auth.pass) missing.push('SMTP_PASS');

    if (missing.length > 0) {
        const error = new Error(`Missing required SMTP configuration: ${missing.join(', ')}`);
        error.code = 'ERR_MISSING_SMTP_CONFIG';
        error.missingFields = missing;
        throw error;
    }

    return config;
}
