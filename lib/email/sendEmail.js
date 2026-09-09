import 'server-only';
import {
    getEmailConfig,
    resolveSenderIdentity,
    ALLOWED_SENDER_KEYS,
    isValidSenderKey,
} from './emailConfig.js';
import { getMailTransporter } from './mailClient.js';

/**
 * lib/email/sendEmail.js
 *
 * Central sendEmail service for InTrust India.
 * Handles validation, default sender configuration, plain-text fallback,
 * lightweight audit logging, and sanitized structured error handling.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Structured error class for all email-related failures.
 */
export class EmailError extends Error {
    /**
     * @param {string} message
     * @param {string} code
     * @param {object} [details]
     */
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'EmailError';
        this.code = code;
        this.details = details;
    }
}

/**
 * Mask an email address for safe logging without exposing full identity in logs.
 * Example: "hello@intrustindia.com" -> "he***o@intrustindia.com"
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return '***';
    }
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
        return `${local[0] || '*'}***@${domain}`;
    }
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

/**
 * Strip HTML tags to produce a clean plain-text fallback when only HTML is provided.
 *
 * @param {string} html
 * @returns {string}
 */
function htmlToPlainText(html) {
    if (!html) return '';
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<td[^>]*>/gi, '  ')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Normalize and validate one or more recipient email addresses.
 *
 * @param {string | string[]} to
 * @returns {string[]}
 */
function normalizeRecipients(to) {
    const rawList = Array.isArray(to) ? to : (typeof to === 'string' ? to.split(',') : []);
    const normalized = rawList
        .map(addr => (typeof addr === 'string' ? addr.trim().toLowerCase() : ''))
        .filter(Boolean);

    if (normalized.length === 0) {
        throw new EmailError('At least one recipient email address is required', 'ERR_EMPTY_RECIPIENT');
    }

    for (const email of normalized) {
        if (!EMAIL_RE.test(email)) {
            throw new EmailError(
                `Invalid recipient email address format: "${maskEmail(email)}"`,
                'ERR_INVALID_RECIPIENT',
                { invalidEmail: maskEmail(email) }
            );
        }
    }

    return normalized;
}

/**
 * Core transactional email dispatch service.
 *
 * @param {object} params
 * @param {string | string[]} params.to - Recipient(s)
 * @param {string} params.subject - Email subject line
 * @param {string} [params.html] - HTML email body
 * @param {string} [params.text] - Plain-text email body (auto-generated from HTML if omitted)
 * @param {string} [params.from] - Custom raw sender (defaults to configured sender identity)
 * @param {string} [params.sender='default'] - Pre-configured functional sender identity (e.g. 'info', 'support')
 * @param {string} [params.replyTo] - Custom reply-to address
 * @param {string} [params.category='transactional'] - Diagnostic category for logging/tracking
 * @param {Record<string, unknown>} [params.metadata={}] - Optional metadata for audit/context
 * @returns {Promise<{ success: boolean, messageId: string, category: string, recipients: string[], sender?: string }>}
 */
export async function sendEmail({
    to,
    subject,
    html,
    text,
    from,
    sender,
    replyTo,
    category = 'transactional',
    metadata = {},
}) {
    const timestamp = new Date().toISOString();

    // 1. Validate recipients
    const recipients = normalizeRecipients(to);
    const maskedRecipients = recipients.map(maskEmail);

    // 2. Validate subject
    const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
    if (!cleanSubject) {
        throw new EmailError('Email subject is required and cannot be empty', 'ERR_EMPTY_SUBJECT');
    }

    // 3. Validate and resolve body content
    const resolvedHtml = typeof html === 'string' && html.trim() ? html.trim() : null;
    let resolvedText = typeof text === 'string' && text.trim() ? text.trim() : null;

    if (!resolvedHtml && !resolvedText) {
        throw new EmailError('Either html or text content must be provided', 'ERR_EMPTY_BODY');
    }

    // Auto-generate text fallback from HTML if not explicitly supplied
    if (!resolvedText && resolvedHtml) {
        resolvedText = htmlToPlainText(resolvedHtml);
    }

    // 4. Resolve sender and reply-to from trusted configuration
    const config = getEmailConfig();
    let senderKey = 'default';
    let resolvedFrom;
    let fallbackReplyTo;

    if (sender !== undefined && sender !== null) {
        // Enforce strict server-side allowlist
        if (typeof sender !== 'string' || !isValidSenderKey(sender)) {
            throw new EmailError(
                `Invalid sender identity key: "${sender}". Allowed identities: ${ALLOWED_SENDER_KEYS.join(', ')}`,
                'ERR_INVALID_SENDER_IDENTITY',
                { sender, allowedKeys: ALLOWED_SENDER_KEYS }
            );
        }
        senderKey = sender;
        const identity = resolveSenderIdentity(senderKey);
        resolvedFrom = identity.formatted;
        fallbackReplyTo = identity.email;
    } else if (from && typeof from === 'string' && from.trim()) {
        senderKey = 'custom';
        resolvedFrom = from.trim();
        fallbackReplyTo = config.fromEmail;
    } else {
        senderKey = 'default';
        const identity = resolveSenderIdentity('default');
        resolvedFrom = identity.formatted;
        fallbackReplyTo = identity.email;
    }

    const explicitReplyTo = process.env.MAIL_REPLY_TO ? process.env.MAIL_REPLY_TO.trim() : null;
    const resolvedReplyTo = replyTo && typeof replyTo === 'string' && replyTo.trim()
        ? replyTo.trim()
        : (explicitReplyTo || fallbackReplyTo);

    // 5. Send via centralized transport
    try {
        const transporter = getMailTransporter();

        const mailOptions = {
            from: resolvedFrom,
            to: recipients.join(', '),
            replyTo: resolvedReplyTo,
            subject: cleanSubject,
            text: resolvedText,
            ...(resolvedHtml ? { html: resolvedHtml } : {}),
        };

        const result = await transporter.sendMail(mailOptions);
        const messageId = result?.messageId || `gen-${Date.now()}`;

        // Lightweight structured audit logging (never logs passwords or full body)
        console.log('[Email] Sent successfully:', {
            category,
            sender: senderKey,
            recipients: maskedRecipients,
            messageId,
            timestamp,
        });

        return {
            success: true,
            messageId,
            category,
            recipients,
            sender: senderKey,
        };
    } catch (err) {
        const error = /** @type {Error & { code?: string }} */ (err);
        const errorCode = error.code || 'ERR_EMAIL_SEND_FAILED';

        console.error('[Email] Dispatch failed:', {
            category,
            recipients: maskedRecipients,
            errorCode,
            errorMessage: error.message,
            timestamp,
        });

        throw new EmailError(
            `Failed to dispatch ${category} email: ${error.message}`,
            errorCode,
            { category, recipients: maskedRecipients, metadata }
        );
    }
}
