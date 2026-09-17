import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/merchantKyc.js
 *
 * Transactional email templates for merchant onboarding, verification, and KYC decisions.
 * Pure functions returning { subject, html, text }.
 */

/**
 * Merchant Application Received Confirmation
 */
export function applicationReceivedTemplate({
    businessName,
    ownerName,
    slaHours = 48,
    actionUrl = 'https://intrustindia.com/merchant-apply',
}) {
    const safeBusiness = escapeHtml(businessName || 'Your Business');
    const safeOwner = escapeHtml(ownerName || 'Merchant');
    const subject = `Application Received: ${businessName || 'Merchant Account'} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Dear <strong>${safeOwner}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Thank you for applying to become an official merchant partner on the InTrust India Network for <strong>${safeBusiness}</strong>!
        </p>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e40af;">Registered Business: <strong style="color: #1e3a8a;">${safeBusiness}</strong></p>
            <p style="margin: 0; font-size: 14px; color: #1e40af;">Application Status: <strong style="color: #2563eb;">Under Review (Manual Verification)</strong></p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
            Our compliance team will review your business credentials, PAN, and banking details within approximately <strong>${escapeHtml(slaHours)} hours</strong>.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">
            Once approved, you will receive instructions to choose a merchant subscription plan and access your merchant fulfillment panel.
        </p>
    `;

    const text = [
        `INTRUST INDIA — MERCHANT APPLICATION RECEIVED`,
        `===========================================`,
        `Dear ${ownerName || 'Merchant'},`,
        ``,
        `Your merchant application for "${businessName}" has been received.`,
        `Our compliance team is reviewing your documents (ETA: ${slaHours} hours).`,
        ``,
        `Check status online: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Merchant Application Received 📝',
            preheader: `Your application for ${businessName} has been received and is under review.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Check Application Status',
            footerNote: 'Need to submit additional documents? Contact notifications@intrustindia.com'
        }),
        text,
    };
}

/**
 * Merchant Application Approved
 */
export function applicationApprovedTemplate({
    businessName,
    ownerName,
    actionUrl = 'https://intrustindia.com/merchant-subscribe',
}) {
    const safeBusiness = escapeHtml(businessName || 'Your Business');
    const safeOwner = escapeHtml(ownerName || 'Merchant');
    const subject = `Congratulations! Merchant Application Approved for ${businessName || 'Your Business'} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Dear <strong>${safeOwner}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Congratulations! We are delighted to inform you that your merchant application for <strong>${safeBusiness}</strong> has been <strong>approved</strong> by our compliance team.
        </p>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #1e3a8a;">Next Step: Activate Merchant Panel</p>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
                Select your preferred merchant subscription plan to activate your storefront, list products, accept store credit, and begin fulfilling customer orders.
            </p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            Plans start at just ₹499/month with instant access to the merchant suite and customer analytics.
        </p>
    `;

    const text = [
        `INTRUST INDIA — MERCHANT APPLICATION APPROVED`,
        `===========================================`,
        `Dear ${ownerName || 'Merchant'},`,
        ``,
        `Congratulations! Your merchant application for "${businessName}" has been APPROVED.`,
        ``,
        `Activate your merchant panel: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Merchant Application Approved 🎉',
            preheader: `Congratulations! ${businessName} is approved on the InTrust India Merchant Network.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Activate Merchant Panel Now',
        }),
        text,
    };
}

/**
 * Merchant Application Rejected
 */
export function applicationRejectedTemplate({
    businessName,
    ownerName,
    reason = '',
    actionUrl = 'https://intrustindia.com/merchant-apply',
}) {
    const safeBusiness = escapeHtml(businessName || 'Your Business');
    const safeOwner = escapeHtml(ownerName || 'Merchant');
    const subject = `Update on Merchant Application for ${businessName || 'Your Business'} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Dear <strong>${safeOwner}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Thank you for your interest in joining InTrust India. After reviewing the submitted business and KYC details for <strong>${safeBusiness}</strong>, our compliance team was unable to approve your application at this time.
        </p>

        ${reason ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; text-transform: uppercase; font-weight: 600; color: #991b1b;">Reason Provided:</p>
                <p style="margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.4;">${escapeHtml(reason)}</p>
            </div>
        ` : ''}

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            You may re-apply or submit corrected documentation through your profile dashboard. If you believe this decision was made in error, please reply to this email or contact our support desk.
        </p>
    `;

    const text = [
        `INTRUST INDIA — MERCHANT APPLICATION UPDATE`,
        `===========================================`,
        `Dear ${ownerName || 'Merchant'},`,
        ``,
        `Your application for "${businessName}" was not approved at this time.`,
        reason ? `Reason: ${reason}` : '',
        ``,
        `Re-apply or review details: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Application Decision Update',
            preheader: `Update regarding your merchant application for ${businessName}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Review Application Details',
            brandColor: '#64748b',
            footerNote: 'Questions about this decision? Contact notifications@intrustindia.com'
        }),
        text,
    };
}

/**
 * Merchant Bank Account Verified
 */
export function bankVerifiedTemplate({
    businessName,
    ownerName,
    bankName = '',
    accountLast4 = '',
    actionUrl = 'https://intrustindia.com/merchant/wallet',
}) {
    const safeBusiness = escapeHtml(businessName || 'Your Business');
    const safeOwner = escapeHtml(ownerName || 'Merchant');
    const subject = `Bank Details Verified for ${businessName || 'Your Business'} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Dear <strong>${safeOwner}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Your settlement bank account details for <strong>${safeBusiness}</strong> have been successfully verified by our finance verification team.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #166534;">Bank Verification: <strong>VERIFIED ✅</strong></p>
            ${bankName ? `<p style="margin: 0 0 4px 0; font-size: 14px; color: #334155;">Bank: <strong>${escapeHtml(bankName)}</strong></p>` : ''}
            ${accountLast4 ? `<p style="margin: 0; font-size: 14px; color: #334155;">Account Ending: <strong>****${escapeHtml(accountLast4)}</strong></p>` : ''}
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
            You are now eligible to request automated wallet payouts and settle store credit payments directly to this verified account.
        </p>
    `;

    const text = [
        `INTRUST INDIA — BANK ACCOUNT VERIFIED`,
        `===========================================`,
        `Dear ${ownerName || 'Merchant'},`,
        ``,
        `Your bank account for "${businessName}" has been verified.`,
        bankName ? `Bank: ${bankName}` : '',
        accountLast4 ? `Account: ****${accountLast4}` : '',
        ``,
        `Merchant Wallet: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Bank Account Verified ✅',
            preheader: `Your bank details for ${businessName} have been verified. Payouts are enabled.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Wallet & Payouts',
        }),
        text,
    };
}
