/**
 * lib/email/templates/contactNotification.js
 *
 * Contact Form Notification Email Template.
 * Generates subject, responsive HTML email markup, and plain-text fallback.
 */

/**
 * Basic HTML escaping helper to prevent injection in generated HTML emails.
 *
 * @param {unknown} str
 * @returns {string}
 */
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Format timestamp in readable UTC & IST
 *
 * @param {Date} [date]
 * @returns {string}
 */
function formatTimestamp(date = new Date()) {
    try {
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'medium',
        }) + ' IST';
    } catch {
        return date.toISOString();
    }
}

/**
 * Generate Contact Form Notification Email content.
 *
 * @param {object} params
 * @param {string} params.name - Submitter name
 * @param {string} params.email - Submitter email address
 * @param {string} params.subject - Submitter inquiry subject
 * @param {string} params.message - Submitter message body
 * @param {Date|string} [params.receivedAt] - Timestamp of submission
 * @returns {{ subject: string, html: string, text: string }}
 */
export function contactNotificationTemplate({
    name,
    email,
    subject,
    message,
    receivedAt = new Date(),
}) {
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
    const dateObj = receivedAt instanceof Date ? receivedAt : new Date(receivedAt);
    const timestampStr = formatTimestamp(dateObj);

    const emailSubject = `[Inquiry] ${subject} — ${name}`;
    const safeTitle = escapeHtml(emailSubject);

    const text = [
        '─────────────────────────────────────────────────────────────',
        'INTRUST INDIA — NEW CONTACT FORM INQUIRY',
        '─────────────────────────────────────────────────────────────',
        '',
        `From:        ${name}`,
        `Email:       ${email}`,
        `Subject:     ${subject}`,
        `Received At: ${timestampStr}`,
        '',
        '─────────────────────────────────────────────────────────────',
        'MESSAGE CONTENT:',
        '─────────────────────────────────────────────────────────────',
        '',
        message,
        '',
        '─────────────────────────────────────────────────────────────',
        'Direct Reply: Reply directly to this email to respond to the sender.',
        'InTrust India Customer Support & Inquiries | hello@intrustindia.com',
        '─────────────────────────────────────────────────────────────',
    ].join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 32px 16px;
    }
    .card {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
      padding: 28px 32px;
      text-align: left;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #bfdbfe;
    }
    .content {
      padding: 32px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .info-table td {
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .info-label {
      width: 120px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }
    .info-value {
      color: #0f172a;
      font-weight: 500;
    }
    .message-box {
      background-color: #f8fafc;
      border-left: 4px solid #2563eb;
      border-radius: 6px;
      padding: 18px 20px;
      margin: 20px 0;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 32px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    .footer a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <h1>InTrust India</h1>
        <p>New Contact Form Submission</p>
      </div>
      <div class="content">
        <table class="info-table">
          <tr>
            <td class="info-label">Sender</td>
            <td class="info-value"><strong>${safeName}</strong></td>
          </tr>
          <tr>
            <td class="info-label">Email</td>
            <td class="info-value"><a href="mailto:${safeEmail}" style="color: #2563eb; text-decoration: none;">${safeEmail}</a></td>
          </tr>
          <tr>
            <td class="info-label">Subject</td>
            <td class="info-value">${safeSubject}</td>
          </tr>
          <tr>
            <td class="info-label">Received</td>
            <td class="info-value">${timestampStr}</td>
          </tr>
        </table>

        <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
          Message
        </div>
        <div class="message-box">
          ${safeMessage}
        </div>
      </div>
      <div class="footer">
        <p style="margin: 0 0 6px 0;">This email was sent from the InTrust India contact form.</p>
        <p style="margin: 0;">Replying to this notification directly contacts <strong>${safeEmail}</strong>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    return {
        subject: emailSubject,
        html,
        text,
    };
}
