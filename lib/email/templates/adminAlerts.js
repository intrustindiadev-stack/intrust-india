import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/adminAlerts.js
 *
 * Transactional email templates for administrative notifications:
 * new merchant applications, payout requests, high-value alerts, and platform orders.
 * Pure functions returning { subject, html, text }.
 */

function formatRs(amount) {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * New Merchant Application Alert for Admins
 */
export function newMerchantApplicationAlertTemplate({
    businessName,
    ownerName,
    phone = '',
    email = '',
    applicationId,
    actionUrl = 'https://intrustindia.com/admin/merchants',
}) {
    const subject = `[Admin Alert] New Merchant Application: ${businessName || 'Business'} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello Administrator,</p>
        <p style="margin: 0 0 16px 0;">
            A new merchant partner application has been submitted and is waiting in the KYC verification queue.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #0f172a; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Business Name: <strong style="color: #0f172a;">${escapeHtml(businessName)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Applicant Name: <strong style="color: #0f172a;">${escapeHtml(ownerName)}</strong></p>
            ${email ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Email: <strong style="color: #0f172a;">${escapeHtml(email)}</strong></p>` : ''}
            ${phone ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Phone: <strong style="color: #0f172a;">${escapeHtml(phone)}</strong></p>` : ''}
            ${applicationId ? `<p style="margin: 0; font-size: 13px; color: #64748b;">ID: ${escapeHtml(applicationId)}</p>` : ''}
        </div>

        <p style="margin: 0; font-size: 14px; color: #475569;">
            Please verify the business documents, GSTIN/PAN details, and bank account in the admin dashboard.
        </p>
    `;

    const text = [
        `[ADMIN ALERT] NEW MERCHANT APPLICATION`,
        `===========================================`,
        `Business: ${businessName}`,
        `Applicant: ${ownerName}`,
        email ? `Email: ${email}` : '',
        phone ? `Phone: ${phone}` : '',
        applicationId ? `Application ID: ${applicationId}` : '',
        ``,
        `Review in Admin Dashboard: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'New Merchant Application 🏪',
            preheader: `New merchant application received for ${businessName}. Action required.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Review Application in Admin Panel',
            brandColor: '#0f172a',
        }),
        text,
    };
}

/**
 * New Payout Request Alert for Admins
 */
export function newPayoutRequestAlertTemplate({
    merchantName,
    amountRs = 0,
    requestId,
    source = 'wallet',
    actionUrl = 'https://intrustindia.com/admin/payout-requests',
}) {
    const subject = `[Admin Alert] New Withdrawal Request: ${formatRs(amountRs)} from ${merchantName || 'Merchant'} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello Administrator,</p>
        <p style="margin: 0 0 16px 0;">
            A merchant has requested a withdrawal from their balance. Review the request details below:
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Merchant: <strong style="color: #0f172a;">${escapeHtml(merchantName)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 16px; color: #0f172a;">Amount Requested: <strong style="color: #059669;">${formatRs(amountRs)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Source: <strong style="color: #0f172a; text-transform: capitalize;">${escapeHtml(source.replace('_', ' '))}</strong></p>
            ${requestId ? `<p style="margin: 0; font-size: 13px; color: #64748b;">Request ID: ${escapeHtml(requestId)}</p>` : ''}
        </div>

        <p style="margin: 0; font-size: 14px; color: #475569;">
            Please verify settlement eligibility and initiate the bank transfer from the Payouts queue.
        </p>
    `;

    const text = [
        `[ADMIN ALERT] NEW PAYOUT REQUEST`,
        `===========================================`,
        `Merchant: ${merchantName}`,
        `Amount: ${formatRs(amountRs)}`,
        `Source: ${source}`,
        requestId ? `Request ID: ${requestId}` : '',
        ``,
        `Process Payout: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'New Withdrawal Request 💰',
            preheader: `Withdrawal of ${formatRs(amountRs)} requested by ${merchantName}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Review & Process Payout',
            brandColor: '#f59e0b',
        }),
        text,
    };
}

/**
 * Platform New Order Alert for Admins
 */
export function newOrderPlatformAlertTemplate({
    orderShortId,
    amountRs = 0,
    itemCount = 1,
    customerName = 'Customer',
    actionUrl = 'https://intrustindia.com/admin',
}) {
    const subject = `[Admin Alert] New Order #${orderShortId} (${formatRs(amountRs)}) — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello Administrator,</p>
        <p style="margin: 0 0 16px 0;">
            A new shopping order has been placed on the platform.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Order ID: <strong style="color: #0f172a;">#${escapeHtml(orderShortId)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Customer: <strong style="color: #0f172a;">${escapeHtml(customerName)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Total Items: <strong style="color: #0f172a;">${escapeHtml(itemCount)}</strong></p>
            <p style="margin: 0; font-size: 16px; color: #0f172a;">Order Value: <strong style="color: #059669;">${formatRs(amountRs)}</strong></p>
        </div>
    `;

    const text = [
        `[ADMIN ALERT] NEW PLATFORM ORDER`,
        `===========================================`,
        `Order #${orderShortId}`,
        `Customer: ${customerName}`,
        `Items: ${itemCount}`,
        `Value: ${formatRs(amountRs)}`,
        ``,
        `Admin Dashboard: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: `New Platform Order #${orderShortId} 🛍️`,
            preheader: `New order #${orderShortId} for ${formatRs(amountRs)} placed by ${customerName}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View in Admin Panel',
        }),
        text,
    };
}
