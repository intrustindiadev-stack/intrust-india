/**
 * lib/email/templates/aiOrderWithdrawalNotification.js
 *
 * Transactional email template for AI Orders Vault withdrawal alerts sent to platform admins.
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
 * Generate AI Orders Vault Withdrawal Notification Email content.
 *
 * @param {object} params
 * @param {string} params.merchantName - Merchant business or personal name
 * @param {string} [params.merchantEmail] - Merchant contact email
 * @param {string} [params.merchantPhone] - Merchant contact phone
 * @param {number} params.amountRupees - Withdrawal amount in Rupees (e.g. 2000, 90000)
 * @param {string} params.transactionId - Transaction UUID in ai_orders_vault_transactions
 * @param {string} params.vaultId - Vault UUID
 * @param {number} [params.remainingBalanceRupees] - Remaining vault balance in Rupees
 * @param {string} [params.adminPortalUrl] - URL to the admin withdrawals review page
 * @param {Date|string} [params.requestedAt] - Timestamp of the withdrawal request
 * @returns {{ subject: string, html: string, text: string }}
 */
export function aiOrderWithdrawalNotificationTemplate({
    merchantName,
    merchantEmail = '',
    merchantPhone = '',
    amountRupees,
    transactionId,
    vaultId,
    remainingBalanceRupees = 0,
    adminPortalUrl = 'https://intrustindia.com/admin/ai-orders/withdrawals',
    requestedAt = new Date(),
}) {
    const safeMerchantName = escapeHtml(merchantName || 'Merchant');
    const safeMerchantEmail = escapeHtml(merchantEmail);
    const safeMerchantPhone = escapeHtml(merchantPhone);
    const safeTxId = escapeHtml(transactionId || '—');
    const safeVaultId = escapeHtml(vaultId || '—');
    const safeAdminUrl = escapeHtml(adminPortalUrl);

    const formattedAmount = Number(amountRupees || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const formattedRemaining = Number(remainingBalanceRupees || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const parsedDate = requestedAt instanceof Date ? requestedAt : new Date(requestedAt);
    const formattedDate = formatTimestamp(parsedDate);

    const subject = `[Action Required] AI Orders Vault Withdrawal Request: ₹${formattedAmount} — ${safeMerchantName}`;

    const text = [
        '==========================================================',
        'INTRUST INDIA — AI ORDERS VAULT WITHDRAWAL REQUEST',
        '==========================================================',
        '',
        'A merchant has submitted a withdrawal request from their AI Orders Vault.',
        'Immediate administrative review and approval is required.',
        '',
        '----------------------------------------------------------',
        'WITHDRAWAL DETAILS',
        '----------------------------------------------------------',
        `Requested Amount:     ₹${formattedAmount}`,
        `Merchant Name:        ${safeMerchantName}`,
        `Merchant Email:       ${safeMerchantEmail || 'N/A'}`,
        `Merchant Phone:       ${safeMerchantPhone || 'N/A'}`,
        `Transaction ID:       ${safeTxId}`,
        `Vault ID:             ${safeVaultId}`,
        `Remaining Vault Bal:  ₹${formattedRemaining}`,
        `Requested At:         ${formattedDate}`,
        '',
        '----------------------------------------------------------',
        'ACTION REQUIRED',
        '----------------------------------------------------------',
        `Review and approve/reject this withdrawal in the Admin Portal:`,
        `${safeAdminUrl}`,
        '',
        '----------------------------------------------------------',
        'InTrust India Central Notification Dispatcher',
        'Confidential & Proprietary — For Authorized Administrators Only',
    ].join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%); padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #93c5fd; background-color: rgba(255, 255, 255, 0.12); padding: 4px 10px; border-radius: 6px; margin-bottom: 12px;">
                      Admin Notification &bull; AI Orders
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                      New Vault Withdrawal Request
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #cbd5e1;">
                      Merchant payout request awaiting administrative approval.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Amount Highlight Card -->
          <tr>
            <td style="padding: 28px 36px 12px 36px;">
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 12px; padding: 20px 24px;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b;">Withdrawal Amount</span>
                      <div style="font-size: 32px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                        ₹${formattedAmount}
                      </div>
                      <span style="display: inline-block; margin-top: 6px; font-size: 12px; font-weight: 600; color: #d97706; background-color: #fef3c7; padding: 2px 8px; border-radius: 6px;">
                        Status: PENDING ADMIN APPROVAL
                      </span>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Details Table -->
          <tr>
            <td style="padding: 16px 36px 28px 36px;">
              <h2 style="font-size: 14px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 14px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                Merchant &amp; Vault Details
              </h2>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px;">
                <tr>
                  <td style="padding: 9px 0; color: #64748b; width: 140px; vertical-align: top; font-weight: 600;">Merchant Name:</td>
                  <td style="padding: 9px 0; color: #0f172a; font-weight: 700;">${safeMerchantName}</td>
                </tr>
                ${safeMerchantEmail ? `<tr>
                  <td style="padding: 9px 0; color: #64748b; vertical-align: top; font-weight: 600;">Merchant Email:</td>
                  <td style="padding: 9px 0; color: #0f172a;"><a href="mailto:${safeMerchantEmail}" style="color: #2563eb; text-decoration: none;">${safeMerchantEmail}</a></td>
                </tr>` : ''}
                ${safeMerchantPhone ? `<tr>
                  <td style="padding: 9px 0; color: #64748b; vertical-align: top; font-weight: 600;">Phone Number:</td>
                  <td style="padding: 9px 0; color: #0f172a;">${safeMerchantPhone}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 9px 0; color: #64748b; vertical-align: top; font-weight: 600;">Transaction ID:</td>
                  <td style="padding: 9px 0; color: #0f172a; font-family: monospace; font-size: 13px;">${safeTxId}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; color: #64748b; vertical-align: top; font-weight: 600;">Vault ID:</td>
                  <td style="padding: 9px 0; color: #0f172a; font-family: monospace; font-size: 13px;">${safeVaultId}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; color: #64748b; vertical-align: top; font-weight: 600;">Remaining Balance:</td>
                  <td style="padding: 9px 0; color: #059669; font-weight: 700;">₹${formattedRemaining}</td>
                </tr>
                <tr>
                  <td style="padding: 9px 0; color: #64748b; vertical-align: top; font-weight: 600;">Timestamp:</td>
                  <td style="padding: 9px 0; color: #64748b;">${formattedDate}</td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="margin-top: 28px; text-align: center;">
                <a href="${safeAdminUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.25);">
                  Review in Admin Portal &rarr;
                </a>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
                  Click above to approve or reject this withdrawal in real-time.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 36px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                InTrust India Platform Administration &bull; Automated System Dispatch
              </p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">
                This alert was generated automatically when a merchant initiated a vault withdrawal.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { subject, html, text };
}
