import 'server-only';

/**
 * lib/email/templates/layout.js
 *
 * Unified responsive base HTML layout and escaping helper for all InTrust India transactional emails.
 * Table-based 600px layout with inline CSS for cross-client compatibility (Gmail, Outlook, Apple Mail).
 */

/**
 * Basic HTML escaping helper to prevent XSS/injection in generated HTML emails.
 *
 * @param {unknown} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Base email layout wrapper.
 *
 * @param {object} params
 * @param {string} params.title - Main heading / email title
 * @param {string} [params.preheader=''] - Inbox preview text snippet (hidden in body)
 * @param {string} params.bodyHtml - Rendered HTML content to place inside the card
 * @param {string} [params.ctaUrl] - Optional URL for primary call-to-action button
 * @param {string} [params.ctaLabel] - Label for the CTA button
 * @param {string} [params.footerNote] - Optional secondary note in footer
 * @param {string} [params.brandColor='#059669'] - Primary brand accent color (default InTrust Emerald)
 * @returns {string} - Complete HTML document
 */
export function baseEmailLayout({
    title,
    preheader = '',
    bodyHtml,
    ctaUrl,
    ctaLabel,
    footerNote = '',
    brandColor = '#059669',
}) {
    const safeTitle = escapeHtml(title);
    const safePreheader = escapeHtml(preheader);
    const safeFooterNote = footerNote ? escapeHtml(footerNote) : '';
    const currentYear = new Date().getFullYear();

    const ctaHtml = (ctaUrl && ctaLabel) ? `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
            <tr>
                <td align="center">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1.2; text-align: center; text-decoration: none; padding: 14px 28px; border-radius: 6px; -webkit-text-size-adjust: none; mso-padding-alt: 0;">
                        <!--[if mso]><i style="letter-spacing: 28px; mso-font-width: -100%; mso-text-raise: 30pt">&nbsp;</i><![endif]-->
                        <span style="mso-text-raise: 15pt;">${escapeHtml(ctaLabel)}</span>
                        <!--[if mso]><i style="letter-spacing: 28px; mso-font-width: -100%;">&nbsp;</i><![endif]-->
                    </a>
                </td>
            </tr>
        </table>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${safeTitle}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f8fafc; }
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: auto !important; }
            .content-padding { padding: 24px 16px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <!-- Hidden Preheader -->
    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
        ${safePreheader || safeTitle}
        &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
    </div>

    <!-- Outer Wrapper -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc;">
        <tr>
            <td align="center" style="padding: 32px 12px 40px 12px;">
                <!-- 600px Container Card -->
                <table role="presentation" class="email-container" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <!-- Brand Header Bar -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 20px 28px; border-bottom: 3px solid ${brandColor};">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">INTRUST<span style="color: ${brandColor};">.INDIA</span></span>
                                    </td>
                                    <td align="right">
                                        <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Official Notification</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td class="content-padding" style="padding: 32px 28px 24px 28px;">
                            <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                                ${safeTitle}
                            </h1>

                            <div style="font-size: 15px; line-height: 1.6; color: #334155;">
                                ${bodyHtml}
                            </div>

                            ${ctaHtml}
                        </td>
                    </tr>

                    <!-- Footer Section -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
                            ${safeFooterNote ? `<p style="margin: 0 0 10px 0; color: #475569;">${safeFooterNote}</p>` : ''}
                            <p style="margin: 0 0 6px 0;">
                                <strong>InTrust India</strong> &bull; Secure Financial & Commerce Platform
                            </p>
                            <p style="margin: 0; color: #94a3b8;">
                                &copy; ${currentYear} InTrust India. All rights reserved. &bull; <a href="https://intrustindia.com" style="color: ${brandColor}; text-decoration: none;">intrustindia.com</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}
