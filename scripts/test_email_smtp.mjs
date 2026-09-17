#!/usr/bin/env node

/**
 * scripts/test_email_smtp.mjs
 *
 * Diagnostic CLI utility for verifying InTrust India's SMTP connection
 * and functional sender alias identities.
 *
 * Usage:
 *   # Handshake verification only:
 *   node --env-file=.env.local scripts/test_email_smtp.mjs --verify-only
 *
 *   # Send single test email from default sender (hello@):
 *   node --env-file=.env.local scripts/test_email_smtp.mjs --to recipient@example.com
 *
 *   # Send single test email from specific sender alias (e.g. info, support, security):
 *   node --env-file=.env.local scripts/test_email_smtp.mjs --to recipient@example.com --sender info
 *
 *   # Explicitly verify all 8 sender identities against SMTP:
 *   node --env-file=.env.local scripts/test_email_smtp.mjs --to recipient@example.com --all-aliases
 *
 * Security:
 *   Never prints SMTP_PASS or raw authorization tokens.
 */

import nodemailer from 'nodemailer';

const EMAIL_SENDERS = {
    default: {
        email: 'hello@intrustindia.com',
        name: 'InTrust India',
    },
    info: {
        email: 'info@intrustindia.com',
        name: 'InTrust India',
    },
    support: {
        email: 'support@intrustindia.com',
        name: 'InTrust India Support',
    },
    accounts: {
        email: 'accounts@intrustindia.com',
        name: 'InTrust India Accounts',
    },
    hr: {
        email: 'hr@intrustindia.com',
        name: 'InTrust India HR',
    },
    orders: {
        email: 'orders@intrustindia.com',
        name: 'InTrust India Orders',
    },
    notifications: {
        email: 'notifications@intrustindia.com',
        name: 'InTrust India',
    },
    security: {
        email: 'security@intrustindia.com',
        name: 'InTrust India Security',
    },
};

const ALLOWED_KEYS = Object.keys(EMAIL_SENDERS);
const DEFAULT_SMTP_PORT = 587;

// CLI arguments parsing
const args = process.argv.slice(2);
const toIndex = args.indexOf('--to');
const targetRecipient = toIndex !== -1 && args[toIndex + 1] ? args[toIndex + 1] : null;

const senderIndex = args.indexOf('--sender');
const requestedSender = senderIndex !== -1 && args[senderIndex + 1] ? args[senderIndex + 1].toLowerCase() : 'default';

const allAliases = args.includes('--all-aliases');
const verifyOnly = args.includes('--verify-only') || (!targetRecipient && !allAliases);

function maskEmail(email) {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

function renderHtml(fromName, fromEmail, replyTo, identityKey) {
    const dispatchedAt = new Date().toISOString();
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>InTrust India - Sender Smoke Test</title>
    <style>
        :root {
            color-scheme: light;
            supported-color-schemes: light;
        }
        /* Preserve theme colors in Dark Mode */
        @media (prefers-color-scheme: dark) {
            body, .page-bg {
                background-color: #f1f5f9 !important;
                background-image: linear-gradient(#f1f5f9, #f1f5f9) !important;
            }
            .email-container, .card-bg {
                background-color: #ffffff !important;
                background-image: linear-gradient(#ffffff, #ffffff) !important;
            }
            .status-box {
                background-color: #ecfdf5 !important;
                background-image: linear-gradient(#ecfdf5, #ecfdf5) !important;
            }
            .status-title {
                color: #065f46 !important;
            }
            .status-desc {
                color: #374151 !important;
            }
            .data-table {
                background-color: #f8fafc !important;
                background-image: linear-gradient(#f8fafc, #f8fafc) !important;
            }
            .text-dark {
                color: #1e293b !important;
            }
            .text-label {
                color: #64748b !important;
            }
            .footer-bg {
                background-color: #ffffff !important;
                background-image: linear-gradient(#ffffff, #ffffff) !important;
            }
        }
        [data-ogsb] .email-container,
        [data-ogsb] .card-bg,
        [data-ogsb] .footer-bg {
            background-color: #ffffff !important;
            background-image: linear-gradient(#ffffff, #ffffff) !important;
        }
        [data-ogsb] .status-box {
            background-color: #ecfdf5 !important;
            background-image: linear-gradient(#ecfdf5, #ecfdf5) !important;
        }
        [data-ogsb] .data-table {
            background-color: #f8fafc !important;
            background-image: linear-gradient(#f8fafc, #f8fafc) !important;
        }
        [data-ogsc] .text-dark {
            color: #1e293b !important;
        }
        [data-ogsc] .text-label {
            color: #64748b !important;
        }
        [data-ogsc] .status-title {
            color: #065f46 !important;
        }
        [data-ogsc] .status-desc {
            color: #374151 !important;
        }
        /* Gmail App Dark Mode specific override */
        u + .body .email-container,
        u + .body .card-bg,
        u + .body .footer-bg {
            background-color: #ffffff !important;
            background-image: linear-gradient(#ffffff, #ffffff) !important;
        }
        u + .body .status-box {
            background-color: #ecfdf5 !important;
            background-image: linear-gradient(#ecfdf5, #ecfdf5) !important;
        }
        u + .body .data-table {
            background-color: #f8fafc !important;
            background-image: linear-gradient(#f8fafc, #f8fafc) !important;
        }
        u + .body .text-dark {
            color: #1e293b !important;
        }
        u + .body .text-body {
            color: #334155 !important;
        }
        u + .body .text-label {
            color: #64748b !important;
        }
        u + .body .status-title {
            color: #065f46 !important;
        }
        u + .body .status-desc {
            color: #374151 !important;
        }
    </style>
</head>
<body id="body" class="body page-bg" style="margin: 0; padding: 32px 12px; background-color: #f1f5f9; background-image: linear-gradient(#f1f5f9, #f1f5f9); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center">
                <table role="presentation" class="email-container card-bg" border="0" cellpadding="0" cellspacing="0" width="580" style="max-width: 580px; width: 100%; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8); border: 1px solid #e2e8f0;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #0284c7 100%); background-color: #2563eb; padding: 26px 28px; position: relative; overflow: hidden;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="vertical-align: middle;">
                                        <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align: middle; padding-right: 14px;">
                                                    <img src="https://intrustindia.com/email-templates/icons/logo-badge.png" alt="InTrust India" width="46" height="46" style="display: block; width: 46px; height: 46px; border: 0; outline: none; text-decoration: none;" />
                                                </td>
                                                <td style="vertical-align: middle;">
                                                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.2;">
                                                        Intrust India
                                                    </div>
                                                    <div style="font-size: 13px; color: #e0f2fe; font-weight: 500; margin-top: 3px;">
                                                        Sender Identity Smoke Test
                                                    </div>
                                                    <div style="margin-top: 6px;">
                                                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); color: #ffffff; font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 9999px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${identityKey}</span>
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
                                            SMTP SENDER IDENTITY
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td class="card-bg" style="padding: 28px 28px 24px 28px; background-color: #ffffff; background-image: linear-gradient(#ffffff, #ffffff);">
                            
                            <!-- Status Alert Box -->
                            <table role="presentation" class="status-box" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; background-image: linear-gradient(#ecfdf5, #ecfdf5); border: 1px solid #bbf7d0; border-radius: 12px; margin-bottom: 22px;">
                                <tr>
                                    <td style="padding: 16px 16px; vertical-align: middle; width: 44px;">
                                        <img src="https://intrustindia.com/email-templates/icons/badge-check.png" width="38" height="38" alt="✓" style="display: block; width: 38px; height: 38px; border-radius: 50%; border: 0;" />
                                    </td>
                                    <td style="padding: 16px 16px 16px 0; vertical-align: middle;">
                                        <div class="status-title" style="font-size: 15px; font-weight: 700; color: #065f46; margin-bottom: 3px;">Status: Active &amp; Verified</div>
                                        <div class="status-desc" style="font-size: 13px; color: #374151; line-height: 1.4;">The sender identity has been successfully verified and is authorized for outbound delivery.</div>
                                    </td>
                                </tr>
                            </table>

                            <!-- Description -->
                            <p class="text-body" style="margin: 0 0 22px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                                This test verifies that the InTrust India sender alias 
                                <span style="display: inline-block; background-color: #eff6ff; color: #2563eb; font-weight: 600; padding: 2px 8px; border-radius: 6px; border: 1px solid #dbeafe;">${fromEmail}</span> 
                                is accepted for outbound delivery by the SMTP provider.
                            </p>

                            <!-- Data Table with Icon Badges -->
                            <table role="presentation" class="data-table" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; background-image: linear-gradient(#f8fafc, #f8fafc); border: 1px solid #e2e8f0; border-radius: 12px; border-collapse: separate; overflow: hidden;">
                                <tr>
                                    <td style="padding: 12px 14px; width: 36px; vertical-align: middle; border-bottom: 1px solid #f1f5f9;">
                                        <img src="https://intrustindia.com/email-templates/icons/badge-key.png" width="34" height="34" alt="Key" style="display: block; width: 34px; height: 34px; border-radius: 8px; border: 0;" />
                                    </td>
                                    <td class="text-label" style="padding: 12px 6px; width: 130px; vertical-align: middle; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">
                                        Identity Key
                                    </td>
                                    <td class="text-dark" style="padding: 12px 14px; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #f1f5f9;">
                                        ${identityKey}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 14px; width: 36px; vertical-align: middle; border-bottom: 1px solid #f1f5f9;">
                                        <img src="https://intrustindia.com/email-templates/icons/badge-mail.png" width="34" height="34" alt="Mail" style="display: block; width: 34px; height: 34px; border-radius: 8px; border: 0;" />
                                    </td>
                                    <td class="text-label" style="padding: 12px 6px; vertical-align: middle; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">
                                        Sender (From)
                                    </td>
                                    <td class="text-dark" style="padding: 12px 14px; vertical-align: middle; font-size: 13px; border-bottom: 1px solid #f1f5f9;">
                                        <strong style="color: #1e293b;">${fromName}</strong> <a href="mailto:${fromEmail}" style="color: #2563eb; text-decoration: none; font-weight: 500;">&lt;${fromEmail}&gt;</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 14px; width: 36px; vertical-align: middle; border-bottom: 1px solid #f1f5f9;">
                                        <img src="https://intrustindia.com/email-templates/icons/badge-reply.png" width="34" height="34" alt="Reply" style="display: block; width: 34px; height: 34px; border-radius: 8px; border: 0;" />
                                    </td>
                                    <td class="text-label" style="padding: 12px 6px; vertical-align: middle; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">
                                        Reply-To
                                    </td>
                                    <td class="text-dark" style="padding: 12px 14px; vertical-align: middle; font-size: 13px; border-bottom: 1px solid #f1f5f9;">
                                        <a href="mailto:${replyTo}" style="color: #2563eb; text-decoration: none; font-weight: 500;">&lt;${replyTo}&gt;</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px 14px; width: 36px; vertical-align: middle;">
                                        <img src="https://intrustindia.com/email-templates/icons/badge-clock.png" width="34" height="34" alt="Time" style="display: block; width: 34px; height: 34px; border-radius: 8px; border: 0;" />
                                    </td>
                                    <td class="text-label" style="padding: 12px 6px; vertical-align: middle; font-size: 13px; color: #64748b; font-weight: 500;">
                                        Dispatched At
                                    </td>
                                    <td class="text-dark" style="padding: 12px 14px; vertical-align: middle; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; font-weight: 600; color: #1e293b;">
                                        ${dispatchedAt}
                                    </td>
                                </tr>
                            </table>

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

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

async function sendSingleEmail(transporter, identityKey, targetTo) {
    const identity = EMAIL_SENDERS[identityKey];
    if (!identity) {
        throw new Error(`Unknown identity key: ${identityKey}. Allowed: ${ALLOWED_KEYS.join(', ')}`);
    }

    const fromEmail = identityKey === 'default'
        ? (process.env.MAIL_FROM_EMAIL || identity.email).trim()
        : identity.email;

    const fromName = identityKey === 'default'
        ? (process.env.MAIL_FROM_NAME || identity.name).trim()
        : identity.name;

    const replyTo = process.env.MAIL_REPLY_TO ? process.env.MAIL_REPLY_TO.trim() : fromEmail;

    const testSubject = `InTrust India Sender Test [${identityKey}] — ${new Date().toLocaleTimeString()}`;
    const testText = [
        `InTrust India — Sender Identity Verification [${identityKey}]`,
        '----------------------------------------------------------',
        `Identity Key: ${identityKey}`,
        `From:         ${fromName} <${fromEmail}>`,
        `Reply-To:     <${replyTo}>`,
        `Sent At:      ${new Date().toISOString()}`,
        '',
        `This email confirms that the sender identity "${identityKey}" (${fromEmail}) is accepted and successfully dispatched.`,
    ].join('\n');

    const testHtml = renderHtml(fromName, fromEmail, replyTo, identityKey);

    const result = await transporter.sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: targetTo,
        replyTo,
        subject: testSubject,
        text: testText,
        html: testHtml,
    });

    return {
        success: true,
        identityKey,
        fromEmail,
        fromName,
        messageId: result.messageId,
        response: result.response,
    };
}

async function run() {
    console.log('====================================================');
    console.log('InTrust India — SMTP Diagnostic & Verification Tool');
    console.log('====================================================\n');

    const host = (process.env.SMTP_HOST || '').trim();
    const rawPort = process.env.SMTP_PORT;
    const port = rawPort ? parseInt(rawPort, 10) : DEFAULT_SMTP_PORT;
    const secure = port === 465 ? true : process.env.SMTP_SECURE === 'true';
    const user = (process.env.SMTP_USER || '').trim();
    const pass = process.env.SMTP_PASS || '';

    console.log('Configuration Inspection:');
    console.log(`  SMTP Host:       ${host || '[NOT SET]'}`);
    console.log(`  SMTP Port:       ${port}`);
    console.log(`  SMTP Secure/TLS: ${secure}`);
    console.log(`  SMTP Auth User:  ${user ? maskEmail(user) : '[NOT SET]'}`);
    console.log(`  SMTP Pass:       ${pass ? '******** [Configured]' : '[NOT SET]'}\n`);

    if (!host || !user || !pass) {
        console.error('❌ Validation Failed: Missing required SMTP credentials.');
        console.error('Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment (.env.local).\n');
        process.exit(1);
    }

    console.log('Initiating Nodemailer transporter verification...');
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });

    try {
        await transporter.verify();
        console.log('✅ SMTP Connection & Authentication Successful!\n');
    } catch (err) {
        console.error('❌ SMTP Handshake Failed:', err.message || err);
        if (err.code) console.error(`   Error Code: ${err.code}`);
        console.error('\nPlease verify your host, port, TLS settings, and credentials.\n');
        process.exit(1);
    }

    if (verifyOnly) {
        console.log('Verification completed (--verify-only specified or no --to recipient).');
        console.log('Available sender identities:');
        for (const [key, id] of Object.entries(EMAIL_SENDERS)) {
            console.log(`  • ${key.padEnd(14)} -> ${id.name} <${id.email}>`);
        }
        console.log('\nTo send a live test email with a specific identity:');
        console.log('  node --env-file=.env.local scripts/test_email_smtp.mjs --to your-email@example.com --sender info\n');
        process.exit(0);
    }

    if (!targetRecipient) {
        console.error('❌ Error: Recipient email address required via --to <recipient>');
        process.exit(1);
    }

    // Single sender dispatch
    if (!allAliases) {
        if (!ALLOWED_KEYS.includes(requestedSender)) {
            console.error(`❌ Invalid sender identity: "${requestedSender}"`);
            console.error(`Allowed identities: ${ALLOWED_KEYS.join(', ')}\n`);
            process.exit(1);
        }

        const identity = EMAIL_SENDERS[requestedSender];
        console.log(`Dispatching real smoke test email using identity "${requestedSender}" (${identity.email}) to: ${targetRecipient}...`);

        try {
            const res = await sendSingleEmail(transporter, requestedSender, targetRecipient);
            console.log('✅ Test email delivered successfully!');
            console.log(`   Identity:    ${res.identityKey}`);
            console.log(`   From:        ${res.fromName} <${res.fromEmail}>`);
            console.log(`   Message ID:  ${res.messageId}`);
            console.log(`   Response:    ${res.response}`);
            console.log(`   Recipient:   ${targetRecipient}\n`);
        } catch (sendErr) {
            console.error(`❌ Failed to dispatch test email with identity "${requestedSender}":`, sendErr.message || sendErr);
            if (sendErr.code) console.error(`   SMTP Error Code:     ${sendErr.code}`);
            if (sendErr.response) console.error(`   SMTP Server Output:  ${sendErr.response}`);
            process.exit(1);
        }
        return;
    }

    // Multiple aliases verification (--all-aliases)
    console.log(`Running outbound delivery verification for all 8 sender identities to: ${targetRecipient}...\n`);

    const results = [];
    for (let i = 0; i < ALLOWED_KEYS.length; i++) {
        const key = ALLOWED_KEYS[i];
        const id = EMAIL_SENDERS[key];
        process.stdout.write(`[${i + 1}/${ALLOWED_KEYS.length}] Testing identity "${key}" (${id.email})... `);

        try {
            const res = await sendSingleEmail(transporter, key, targetRecipient);
            console.log(`✅ SUCCESS (Message ID: ${res.messageId})`);
            results.push({
                key,
                email: id.email,
                name: id.name,
                status: 'PASS',
                detail: res.response || 'Delivered',
            });
        } catch (err) {
            const errorMsg = err.response || err.message || 'Send failed';
            console.log(`❌ REJECTED (${errorMsg})`);
            results.push({
                key,
                email: id.email,
                name: id.name,
                status: 'FAIL',
                detail: errorMsg,
            });
        }

        // Small delay between tests to respect provider rate-limits
        if (i < ALLOWED_KEYS.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    console.log('\n================================================================================');
    console.log('InTrust India — Sender Identities Verification Summary');
    console.log('================================================================================');
    console.log(`${'Key'.padEnd(15)} ${'Email'.padEnd(32)} ${'Status'.padEnd(10)} Detail`);
    console.log('-'.repeat(80));

    let failCount = 0;
    for (const r of results) {
        const statusBadge = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
        console.log(`${r.key.padEnd(15)} ${r.email.padEnd(32)} ${statusBadge.padEnd(10)} ${r.detail}`);
        if (r.status === 'FAIL') failCount++;
    }
    console.log('-'.repeat(80));

    if (failCount === 0) {
        console.log(`🎉 All ${results.length} sender identities verified and accepted by SMTP!\n`);
    } else {
        console.log(`⚠️ Completed with ${failCount} failed identities out of ${results.length}.\n`);
        process.exit(1);
    }
}

run().catch((err) => {
    console.error('Fatal execution error:', err.message || err);
    process.exit(1);
});
