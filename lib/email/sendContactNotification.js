import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Contact-form email notification helper
// ---------------------------------------------------------------------------
// All SMTP / provider details are isolated in this file.
// To swap to Resend, SES, etc., replace the transporter creation below —
// nothing in the route file needs to change.
// ---------------------------------------------------------------------------

/** @type {import('nodemailer').Transporter | null} */
let _transporter = null;

/**
 * Return a lazily-created, cached Nodemailer transporter.
 * Throws if required SMTP env vars are missing.
 */
function getTransporter() {
    if (_transporter) return _transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        throw new Error(
            'Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
        );
    }

    _transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465
        auth: { user, pass },
    });

    return _transporter;
}

/**
 * Send a contact-form notification email.
 *
 * @param {{ name: string, email: string, subject: string, message: string }} data
 * @returns {Promise<void>}
 * @throws on transport / delivery failure (caller decides how to handle)
 */
export async function sendContactNotification({ name, email, subject, message }) {
    const to = process.env.CONTACT_NOTIFICATION_EMAIL || 'info@intrustindia.com';
    const from = process.env.CONTACT_FROM_EMAIL || 'noreply@intrustindia.com';

    const textBody = [
        `New contact form submission`,
        `──────────────────────────`,
        `Name:      ${name}`,
        `Email:     ${email}`,
        `Subject:   ${subject}`,
        ``,
        `Message:`,
        message,
        ``,
        `──────────────────────────`,
        `Received at: ${new Date().toISOString()}`,
    ].join('\n');

    await getTransporter().sendMail({
        from,
        to,
        replyTo: email,
        subject: `New contact form: ${subject}`,
        text: textBody,
    });
}
