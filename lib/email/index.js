import 'server-only';

/**
 * lib/email/index.js
 *
 * Primary entry point for transactional email services at InTrust India.
 */

export { sendEmail, EmailError, maskEmail } from './sendEmail.js';
export { getMailTransporter, resetMailTransporter, verifySmtpConnection } from './mailClient.js';
export {
    getEmailConfig,
    validateEmailConfig,
    EMAIL_SENDERS,
    ALLOWED_SENDER_KEYS,
    isValidSenderKey,
    resolveSenderIdentity,
} from './emailConfig.js';
export * from './templates/index.js';
