import 'server-only';

/**
 * lib/email/mailer.js
 *
 * Thin alias re-exporting the centralized mail client functions.
 * Does NOT instantiate or configure a new transporter.
 * Sole transporter creation remains in lib/email/mailClient.js.
 */

export {
    getMailTransporter,
    resetMailTransporter,
    verifySmtpConnection,
} from './mailClient.js';
