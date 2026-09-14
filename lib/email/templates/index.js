import 'server-only';

/**
 * lib/email/templates/index.js
 *
 * Central template registry for InTrust India transactional emails.
 * Pure functions returning { subject: string, html: string, text: string }.
 */

export { baseEmailLayout, escapeHtml } from './layout.js';
export { contactNotificationTemplate } from './contactNotification.js';
export { aiOrderWithdrawalNotificationTemplate } from './aiOrderWithdrawalNotification.js';

export * from './customerOrders.js';
export * from './merchantKyc.js';
export * from './merchantOps.js';
export * from './adminAlerts.js';
export * from './hrm.js';
export * from './employee.js';
export * from './crm.js';
export * from './auth.js';
export * from './finance.js';
