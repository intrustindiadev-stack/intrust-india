import 'server-only';

/**
 * lib/email/templates/layout.js
 *
 * Unified responsive base HTML layout and escaping helper for all InTrust India transactional emails.
 * Premium enterprise fintech aesthetic matching InTrust Centralized Mail Infrastructure.
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
 * @param {string} [params.subtitle] - Subtitle under brand in header
 * @param {string} [params.categoryTag='Official'] - Tag pill shown in header (e.g. 'notifications', 'security')
 * @param {string} [params.preheader=''] - Inbox preview text snippet (hidden in body)
 * @param {string} params.bodyHtml - Rendered HTML content to place inside the card
 * @param {string} [params.ctaUrl] - Optional URL for primary call-to-action button
 * @param {string} [params.ctaLabel] - Label for the CTA button
 * @param {string} [params.footerNote] - Optional secondary note in footer
 * @param {string} [params.brandColor='#2563eb'] - Primary brand accent color
 * @returns {string} - Complete HTML document
 */
export function baseEmailLayout({
    title,
    subtitle = 'Centralized Transactional Notification',
    categoryTag = 'Official',
    preheader = '',
    bodyHtml,
    ctaUrl,
    ctaLabel,
    footerNote = '',
    brandColor = '#2563eb',
}) {
    const safeTitle = escapeHtml(title);
    const safeSubtitle = escapeHtml(subtitle);
    const safeCategoryTag = escapeHtml(categoryTag);
    const safePreheader = escapeHtml(preheader);
    const safeFooterNote = footerNote ? escapeHtml(footerNote) : '';
    const currentYear = new Date().getFullYear();

    const ctaHtml = (ctaUrl && ctaLabel) ? `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
            <tr>
                <td align="left">
                    <a href="${escapeHtml(ctaUrl)}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); background-color: ${brandColor}; color: #ffffff !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; line-height: 1.2; text-align: center; text-decoration: none; padding: 13px 28px; border-radius: 8px; -webkit-text-size-adjust: none; mso-padding-alt: 0; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);">
                        <!--[if mso]><i style="letter-spacing: 28px; mso-font-width: -100%; mso-text-raise: 28pt">&nbsp;</i><![endif]-->
                        <span style="mso-text-raise: 14pt; color: #ffffff !important;">${escapeHtml(ctaLabel)}</span>
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
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
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
        :root {
            color-scheme: light;
            supported-color-schemes: light;
        }
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; }
        a { transition: all 0.2s ease-in-out; }
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; margin: auto !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
            .content-padding { padding: 24px 20px !important; }
            .header-padding { padding: 22px 20px !important; }
        }
        /* Preserve theme in Dark Mode */
        @media (prefers-color-scheme: dark) {
            body, .page-bg {
                background-color: #f1f5f9 !important;
                background-image: linear-gradient(#f1f5f9, #f1f5f9) !important;
            }
            .email-container, .card-bg {
                background-color: #ffffff !important;
                background-image: linear-gradient(#ffffff, #ffffff) !important;
            }
            .footer-bg {
                background-color: #ffffff !important;
                background-image: linear-gradient(#ffffff, #ffffff) !important;
            }
            .secondary-footer {
                background-color: #f8fafc !important;
                background-image: linear-gradient(#f8fafc, #f8fafc) !important;
            }
            .text-dark {
                color: #0f172a !important;
            }
            .text-body {
                color: #334155 !important;
            }
            .text-muted {
                color: #64748b !important;
            }
        }
        [data-ogsb] .email-container,
        [data-ogsb] .card-bg,
        [data-ogsb] .footer-bg {
            background-color: #ffffff !important;
            background-image: linear-gradient(#ffffff, #ffffff) !important;
        }
        [data-ogsb] .secondary-footer {
            background-color: #f8fafc !important;
            background-image: linear-gradient(#f8fafc, #f8fafc) !important;
        }
        [data-ogsc] .text-dark {
            color: #0f172a !important;
        }
        [data-ogsc] .text-body {
            color: #334155 !important;
        }
        [data-ogsc] .text-muted {
            color: #64748b !important;
        }
        /* Gmail App Dark Mode specific override */
        u + .body .email-container,
        u + .body .card-bg,
        u + .body .footer-bg {
            background-color: #ffffff !important;
            background-image: linear-gradient(#ffffff, #ffffff) !important;
        }
        u + .body .secondary-footer {
            background-color: #f8fafc !important;
            background-image: linear-gradient(#f8fafc, #f8fafc) !important;
        }
        u + .body .text-dark {
            color: #0f172a !important;
        }
        u + .body .text-body {
            color: #334155 !important;
        }
        u + .body .text-muted {
            color: #64748b !important;
        }
    </style>
</head>
<body id="body" class="body page-bg" style="margin: 0; padding: 0; background-color: #f1f5f9; background-image: linear-gradient(#f1f5f9, #f1f5f9); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
    <!-- Hidden Preheader -->
    <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
        ${safePreheader || safeTitle}
        &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
    </div>

    <!-- Spacer -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="36"></td></tr></table>

    <!-- Outer Wrapper -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="page-bg" style="background-color: #f1f5f9; background-image: linear-gradient(#f1f5f9, #f1f5f9);">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" class="email-container card-bg" border="0" cellpadding="0" cellspacing="0" width="580" style="max-width: 580px; width: 100%; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8); border: 1px solid #e2e8f0;">
                    
                    <!-- High-Fidelity Enterprise Gradient Header -->
                    <tr>
                        <td class="header-padding" style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #0284c7 100%); background-color: #2563eb; padding: 26px 28px; position: relative; overflow: hidden;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 14px;">
                                                    <img src="https://intrustindia.com/email-templates/icons/logo-badge.png" alt="InTrust India" width="46" height="46" style="display: block; width: 46px; height: 46px; border: 0; outline: none; text-decoration: none;" />
                                                </td>
                                                <td style="vertical-align: middle; text-align: left;">
                                                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.2;">
                                                        Intrust India
                                                    </div>
                                                    <div style="font-size: 13px; color: #e0f2fe; font-weight: 500; margin-top: 3px;">
                                                        ${safeSubtitle}
                                                    </div>
                                                    <div style="margin-top: 6px;">
                                                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); color: #ffffff; font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 9999px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${safeCategoryTag}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align: top;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display: inline-table; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 9999px;">
                                            <tr>
                                                <td style="padding: 5px 12px; vertical-align: middle;">
                                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="vertical-align: middle; padding-right: 6px;">
                                                                <img src="https://intrustindia.com/email-templates/icons/badge-verified.png" width="16" height="16" alt="✓" style="display: block; width: 16px; height: 16px; border-radius: 50%; border: 0;" />
                                                            </td>
                                                            <td style="vertical-align: middle; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;">
                                                                VERIFIED ACTIVE
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                        <div style="color: #bfdbfe; font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 6px; text-align: right;">
                                            TRANSACTIONAL SYSTEM
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td class="card-bg content-padding" style="padding: 32px 28px 24px 28px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff);">
                            <h1 class="text-dark" style="margin: 0 0 18px 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3; letter-spacing: -0.4px;">
                                ${safeTitle}
                            </h1>

                            <div class="text-body" style="font-size: 14px; line-height: 1.65; color: #334155;">
                                ${bodyHtml}
                            </div>

                            ${ctaHtml}
                        </td>
                    </tr>

                    <!-- Enterprise Split Footer -->
                    <tr>
                        <td class="footer-bg" style="padding: 16px 24px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff); border-top: 1px solid #f1f5f9;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 8px;">
                                                    <img src="https://intrustindia.com/email-templates/icons/badge-shield.png" width="22" height="22" alt="Shield" style="display: block; width: 22px; height: 22px; border-radius: 6px; border: 0;" />
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <span style="color: #475569; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">INTRUST INDIA</span>
                                                    <span style="color: #cbd5e1; margin: 0 6px;">|</span>
                                                    <span style="color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">CENTRALIZED TRANSACTIONAL MAIL INFRASTRUCTURE</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                        <span style="color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">SECURE &bull; RELIABLE &bull; SCALABLE</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Secondary Footer Note & Links -->
                    <tr>
                        <td class="secondary-footer" style="background-color: #f8fafc; background-image: linear-gradient(#f8fafc, #f8fafc); padding: 20px 24px; text-align: center; border-top: 1px solid #f1f5f9;">
                            ${safeFooterNote ? `<p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b; line-height: 1.5;">${safeFooterNote}</p>` : ''}
                            
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px;">
                                <tr>
                                    <td align="center">
                                        <a href="https://intrustindia.com/help" style="color: #64748b; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 10px;">Help Center</a>
                                        <span style="color: #cbd5e1;">&bull;</span>
                                        <a href="https://intrustindia.com/privacy" style="color: #64748b; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 10px;">Privacy Policy</a>
                                        <span style="color: #cbd5e1;">&bull;</span>
                                        <a href="https://intrustindia.com/terms" style="color: #64748b; text-decoration: none; font-size: 12px; font-weight: 500; margin: 0 10px;">Terms of Service</a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                                &copy; ${currentYear} InTrust India. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
                <!-- /Main Container -->
            </td>
        </tr>
    </table>

    <!-- Spacer -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td height="36"></td></tr></table>
</body>
</html>`;
}
