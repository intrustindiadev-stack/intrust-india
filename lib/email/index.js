import 'server-only';

/**
 * lib/email/index.js
 *
 * Primary entry point for transactional email services at InTrust India.
 * Centralizes configuration, SMTP transport, dispatch helpers, domain wrappers, and template registry.
 */

export { sendEmail, EmailError, maskEmail } from './sendEmail.js';
export { getMailTransporter, resetMailTransporter, verifySmtpConnection } from './mailClient.js';
export { fireAndForgetEmail, safeEmail } from './dispatch.js';
export {
    getEmailConfig,
    validateEmailConfig,
    EMAIL_SENDERS,
    ALLOWED_SENDER_KEYS,
    isValidSenderKey,
    resolveSenderIdentity,
} from './emailConfig.js';

// Domain-specific dispatch wrappers
export { sendCustomerOrderEmail } from './sendCustomerOrderEmail.js';
export { sendMerchantAlert } from './sendMerchantAlert.js';
export { sendAdminAlert } from './sendAdminAlert.js';
export { sendHRMAlert } from './sendHRMAlert.js';
export { sendEmployeeAlert } from './sendEmployeeAlert.js';
export { sendCRMAlert } from './sendCRMAlert.js';
export { sendAuthEmail } from './sendAuthEmail.js';
export { sendContactNotification } from './sendContactNotification.js';

// Template registry
export * from './templates/index.js';
