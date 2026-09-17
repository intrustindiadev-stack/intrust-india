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
        <p style="margin: 0 0 18px 0; color: #334155;">
            Welcome to <strong>InTrust India</strong>! We are delighted to have you as part of our verified platform. Your account is active and ready to use.
        </p>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px;">
                Platform Highlights
            </p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td style="padding: 4px 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
                        <span style="display: inline-block; width: 18px; height: 18px; background-color: #2563eb; color: #ffffff; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; margin-right: 8px;">✓</span>
                        Shop from verified merchant partners across India
                    </td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
                        <span style="display: inline-block; width: 18px; height: 18px; background-color: #2563eb; color: #ffffff; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; margin-right: 8px;">✓</span>
                        Earn and scratch reward cards on eligible purchases
                    </td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
                        <span style="display: inline-block; width: 18px; height: 18px; background-color: #2563eb; color: #ffffff; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; margin-right: 8px;">✓</span>
                        Flexible store credit & instant checkout options
                    </td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; font-size: 14px; color: #1e40af; line-height: 1.5;">
                        <span style="display: inline-block; width: 18px; height: 18px; background-color: #2563eb; color: #ffffff; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; margin-right: 8px;">✓</span>
                        Bank-grade wallet security and transparent ledger
                    </td>
                </tr>
            </table>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #64748b;">
                Registered Account: <strong style="color: #0f172a;">${escapeHtml(email)}</strong>
            </p>
        </div>
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

/**
 * Sign-in / Login Security Alert for Account Activity
 */
export function loginAlertTemplate({
    fullName = 'Valued User',
    email = '',
    loginTime = '',
    loginMethod = 'Google OAuth',
    deviceInfo = '',
    ipAddress = '',
    actionUrl = 'https://intrustindia.com/profile',
}) {
    const timeDisplay = loginTime || (new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    }) + ' IST');

    const subject = `Security Alert: New Sign-in to InTrust India (${timeDisplay})`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(fullName)}</strong>,</p>
        <p style="margin: 0 0 16px 0; color: #334155;">
            We detected a new sign-in to your InTrust India account. If this was you, you can safely disregard this email.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
                Account: <a href="mailto:${escapeHtml(email)}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${escapeHtml(email)}</a>
            </p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
                Time: <strong style="color: #0f172a;">${escapeHtml(timeDisplay)}</strong>
            </p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
                Sign-in Method: <strong style="color: #0f172a;">${escapeHtml(loginMethod)}</strong>
            </p>
            ${deviceInfo ? `
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">
                Device / Browser: <span style="color: #0f172a;">${escapeHtml(deviceInfo)}</span>
            </p>` : ''}
            ${ipAddress ? `
            <p style="margin: 0; font-size: 14px; color: #475569;">
                IP Address: <span style="color: #0f172a;">${escapeHtml(ipAddress)}</span>
            </p>` : ''}
        </div>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px 18px; margin: 20px 0;">
            <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #991b1b;">
                Did not sign in?
            </p>
            <p style="margin: 0; font-size: 13px; color: #b91c1c; line-height: 1.5;">
                If you did not perform this login, your account credentials may be compromised. Please reset your password immediately and contact support at <a href="mailto:support@intrustindia.com" style="color: #b91c1c; font-weight: 600; text-decoration: underline;">support@intrustindia.com</a>.
            </p>
        </div>
    `;

    const text = [
        `SECURITY ALERT: NEW SIGN-IN TO INTRUST INDIA`,
        `===========================================`,
        `Hello ${fullName},`,
        ``,
        `A new sign-in was detected for your account (${email}):`,
        `Time: ${timeDisplay}`,
        `Method: ${loginMethod}`,
        deviceInfo ? `Device: ${deviceInfo}` : '',
        ipAddress ? `IP Address: ${ipAddress}` : '',
        ``,
        `If this wasn't you, please secure your account immediately: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'New Sign-In Detected 🔐',
            preheader: `Security Alert: New sign-in detected on your InTrust India account (${timeDisplay}).`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Review Account Security',
            footerNote: 'This is an automated security notice sent to protect your InTrust India account.'
        }),
        text,
    };
}
