import 'server-only';

/**
 * lib/email/templates/finance.js
 *
 * Transactional email templates for Invoices, payments, and settlements.
 * Reuses validated copy from lib/notifications/invoiceTemplates.js without forking copy.
 * Pure functions returning { subject, html, text }.
 */

export {
    getInvoiceCreatedTemplate,
    getInvoiceResentTemplate,
    getPaymentSuccessTemplate,
    getPartialPaymentTemplate,
    getPaymentFailedTemplate,
    getDueSoonReminderTemplate,
    getOverdueReminderTemplate,
} from '../../notifications/invoiceTemplates.js';
