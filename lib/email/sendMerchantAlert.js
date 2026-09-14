import 'server-only';
import { sendEmail, EmailError } from './sendEmail.js';
import {
    applicationReceivedTemplate,
    applicationApprovedTemplate,
    applicationRejectedTemplate,
    bankVerifiedTemplate,
    newOrderReceivedTemplate,
    payoutRequestedTemplate,
    payoutStatusUpdateTemplate,
    productDecisionTemplate,
    storeCreditRequestTemplate,
    newReviewAlertTemplate,
    lowStockAlertTemplate,
    vaultWithdrawalDecisionTemplate,
    accountSuspendedTemplate,
} from './templates/index.js';

/**
 * lib/email/sendMerchantAlert.js
 *
 * Domain email wrapper for Merchant KYC, operations, payouts, and inventory alerts.
 * Validates type, resolves template and trusted sender identity, and dispatches via sendEmail.
 */

const ALLOWED_TYPES = Object.freeze([
    'application_received',
    'application_approved',
    'application_rejected',
    'bank_verified',
    'new_order',
    'payout_requested',
    'payout_status',
    'product_decision',
    'store_credit_request',
    'new_review',
    'low_stock',
    'vault_withdrawal_decision',
    'account_suspended',
]);

/**
 * @param {object} params
 * @param {typeof ALLOWED_TYPES[number]} params.type
 * @param {string|string[]} params.to - Recipient merchant email
 * @param {object} params.data - Template-specific payload
 * @param {string} [params.actorId] - Initiating user ID
 * @param {Record<string, unknown>} [params.metadata]
 * @returns {Promise<import('./sendEmail.js').SendEmailResult>}
 */
export async function sendMerchantAlert({ type, to, data = {}, actorId = null, metadata = {} }) {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        throw new EmailError(
            `Invalid merchant alert email type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`,
            'ERR_INVALID_EMAIL_TYPE'
        );
    }

    if (!to) {
        throw new EmailError('Recipient email address (to) is required', 'ERR_EMPTY_RECIPIENT');
    }

    let template;
    let sender = 'notifications';
    let category = 'merchant_alert';

    switch (type) {
        case 'application_received':
            template = applicationReceivedTemplate(data);
            sender = 'notifications';
            category = 'merchant_kyc';
            break;

        case 'application_approved':
            template = applicationApprovedTemplate(data);
            sender = 'notifications';
            category = 'merchant_kyc';
            break;

        case 'application_rejected':
            template = applicationRejectedTemplate(data);
            sender = 'notifications';
            category = 'merchant_kyc';
            break;

        case 'bank_verified':
            template = bankVerifiedTemplate(data);
            sender = 'notifications';
            category = 'merchant_kyc';
            break;

        case 'new_order':
            template = newOrderReceivedTemplate(data);
            sender = 'notifications';
            category = 'merchant_order';
            break;

        case 'payout_requested':
            template = payoutRequestedTemplate(data);
            sender = 'accounts';
            category = 'merchant_payout';
            break;

        case 'payout_status':
            template = payoutStatusUpdateTemplate(data);
            sender = 'accounts';
            category = 'merchant_payout';
            break;

        case 'product_decision':
            template = productDecisionTemplate(data);
            sender = 'notifications';
            category = 'merchant_product';
            break;

        case 'store_credit_request':
            template = storeCreditRequestTemplate(data);
            sender = 'notifications';
            category = 'merchant_udhari';
            break;

        case 'new_review':
            template = newReviewAlertTemplate(data);
            sender = 'notifications';
            category = 'merchant_review';
            break;

        case 'low_stock':
            template = lowStockAlertTemplate(data);
            sender = 'notifications';
            category = 'merchant_inventory';
            break;

        case 'vault_withdrawal_decision':
            template = vaultWithdrawalDecisionTemplate(data);
            sender = 'accounts';
            category = 'merchant_vault';
            break;

        case 'account_suspended':
            template = accountSuspendedTemplate(data);
            sender = 'security';
            category = 'merchant_security';
            break;

        default:
            throw new EmailError(`Unhandled merchant alert email type: ${type}`, 'ERR_UNHANDLED_TYPE');
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
