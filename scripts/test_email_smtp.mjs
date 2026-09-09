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
    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1e40af, #2563eb); padding: 24px; color: white;">
            <h2 style="margin: 0; font-size: 20px;">InTrust India</h2>
            <p style="margin: 6px 0 0; font-size: 13px; color: #bfdbfe;">Sender Identity Smoke Test: <strong>${identityKey}</strong></p>
        </div>
        <div style="padding: 24px; background: white; color: #334155; font-size: 14px; line-height: 1.6;">
            <p><strong>Status:</strong> Active &amp; Verified ✅</p>
            <p>This test verifies that the InTrust India sender alias <strong>${fromEmail}</strong> is accepted for outbound delivery by the SMTP provider.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr><td style="color: #64748b; padding: 6px 0; width: 130px;">Identity Key:</td><td><code>${identityKey}</code></td></tr>
                <tr><td style="color: #64748b; padding: 6px 0;">Sender (From):</td><td><strong>${fromName} &lt;${fromEmail}&gt;</strong></td></tr>
                <tr><td style="color: #64748b; padding: 6px 0;">Reply-To:</td><td><strong>&lt;${replyTo}&gt;</strong></td></tr>
                <tr><td style="color: #64748b; padding: 6px 0;">Dispatched At:</td><td>${new Date().toISOString()}</td></tr>
            </table>
        </div>
        <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
            InTrust India Centralized Transactional Mail Infrastructure
        </div>
    </div>
    `;
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
