import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/auth.js
 *
 * Transactional email templates for authentication and account security:
 * welcome onboarding and security notices.
 * Pure functions returning { subject, html, text }.
 */

/**
 * Welcome Email for Newly Registered Users
 */
export function welcomeEmailTemplate({
    fullName = 'Friend',
    email = '',
    actionUrl = 'https://intrustindia.com/shop',
}) {
    const subject = `Welcome to InTrust India! Start Exploring Financial Freedom`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(fullName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Welcome to InTrust India! We are delighted to have you as part of our growing community.
        </p>

        <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
            With InTrust India, you can:
        </p>
        <ul style="margin: 0 0 20px 0; padding-left: 20px; font-size: 14px; color: #334155; line-height: 1.8;">
            <li>Shop from verified merchant partners across India</li>
            <li>Earn and scratch reward cards on every purchase</li>
            <li>Use flexible deferred payment (Store Credit) at checkout</li>
            <li>Manage your secure InTrust Wallet balance with zero hassle</li>
        </ul>

        <p style="margin: 0; font-size: 14px; color: #64748b;">
            Your registered account: <strong>${escapeHtml(email)}</strong>
        </p>
    `;

    const text = [
        `WELCOME TO INTRUST INDIA!`,
        `===========================================`,
        `Hello ${fullName},`,
        ``,
        `Welcome to InTrust India! Your account (${email}) has been activated.`,
        ``,
        `Start shopping: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Welcome to InTrust India! 🌟',
            preheader: `Hello ${fullName}! Discover shopping, rewards, and store credit on InTrust India.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Explore Storefront',
            footerNote: 'Need assistance? Email support@intrustindia.com'
        }),
        text,
    };
}
