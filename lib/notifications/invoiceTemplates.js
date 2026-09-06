/**
 * lib/notifications/invoiceTemplates.js
 * 
 * Reusable, branded email & text templates for all invoice events.
 * Uses integer paise currency formatting and server-safe tokens.
 */

const fmt = (valPaise) => ((valPaise || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

/**
 * Base email layout wrapper with responsive styling and Intrust India branding
 */
function wrapEmailLayout({ previewText, headerTitle, headerSubtitle, contentHtml, ctaText, ctaUrl }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${headerTitle} - Intrust India</title>
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
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; }
    td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .content-box { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .btn-primary { display: inline-block; background-color: #1e3a5f; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; text-align: center; }
    .btn-success { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 28px; border-radius: 10px; text-align: center; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 12px !important; }
      .p-mobile { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${previewText}
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 30px 0;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; margin: 0 auto;">
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-weight: 900; font-size: 20px; color: #1e3a5f; letter-spacing: -0.5px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: #3b82f6; margin-right: 6px;"></span>
                    INTRUST INDIA
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; padding-top: 2px;">
                    Official Billing & Invoicing
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <div class="content-box">
                <!-- Card Header -->
                <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f2447 100%); padding: 32px 30px; color: #ffffff; text-align: left;">
                  <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                    ${headerTitle}
                  </h1>
                  ${headerSubtitle ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #93c5fd; font-weight: 500;">${headerSubtitle}</p>` : ''}
                </div>

                <!-- Card Body -->
                <div class="p-mobile" style="padding: 32px 30px; color: #334155; font-size: 14px; line-height: 1.6;">
                  ${contentHtml}

                  ${ctaText && ctaUrl ? `
                  <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
                    <a href="${ctaUrl}" target="_blank" class="${headerTitle.includes('Paid') || headerTitle.includes('Receipt') ? 'btn-success' : 'btn-primary'}">
                      ${ctaText} &rarr;
                    </a>
                    <p style="margin: 12px 0 0 0; font-size: 11px; color: #94a3b8;">
                      Instant confirmation • 100% bank-grade encryption
                    </p>
                  </div>
                  ` : ''}
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 6px 0;">
                This is an automated notification from Intrust India for your records.
              </p>
              <p style="margin: 0;">
                &copy; ${new Date().getFullYear()} Intrust India. All rights reserved.
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

/**
 * Summary breakdown block helper for emails
 */
function renderSummaryTable({ invoice, amountDuePaise, isPaid = false }) {
    const total = fmt(invoice.grand_total_paise);
    const paid = fmt(invoice.amount_paid_paise);
    const due = fmt(amountDuePaise);

    return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 20px 0; width: 100%;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <strong>Invoice Number:</strong>
        </td>
        <td align="right" style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-family: monospace; font-weight: 700; color: #1e3a5f;">
          ${invoice.invoice_number}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <strong>Invoice Date:</strong>
        </td>
        <td align="right" style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #334155;">
          ${formatDate(invoice.invoice_date)}
        </td>
      </tr>
      ${invoice.due_date ? `
      <tr>
        <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <strong>Due Date:</strong>
        </td>
        <td align="right" style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #334155;">
          ${formatDate(invoice.due_date)}
        </td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
          <strong>Grand Total:</strong>
        </td>
        <td align="right" style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #0f172a;">
          ₹${total}
        </td>
      </tr>
      ${invoice.amount_paid_paise > 0 ? `
      <tr>
        <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #059669;">
          <strong>Amount Paid:</strong>
        </td>
        <td align="right" style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #059669;">
          -₹${paid}
        </td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 14px 20px; font-size: 13px; font-weight: 800; color: #1e3a5f;">
          ${isPaid ? 'Balance Due:' : 'Amount Currently Due:'}
        </td>
        <td align="right" style="padding: 14px 20px; font-size: 16px; font-weight: 900; color: ${isPaid ? '#059669' : '#1e3a5f'};">
          ₹${isPaid ? '0.00' : due}
        </td>
      </tr>
    </table>`;
}

// ─── 1. Invoice Created Template ─────────────────────────────────────────────
export function getInvoiceCreatedTemplate({ invoice, paymentUrl }) {
    const customerName = invoice.customer_snapshot?.name || 'Valued Customer';
    const amountDuePaise = Math.max(0, (invoice.grand_total_paise || 0) - (invoice.amount_paid_paise || 0));

    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        Dear <strong>${customerName}</strong>,
      </p>
      <p style="margin: 0 0 16px 0;">
        A new invoice <strong>#${invoice.invoice_number}</strong> has been generated and is ready for payment. Please find the invoice summary below:
      </p>

      ${renderSummaryTable({ invoice, amountDuePaise })}

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
        You can review the full invoice breakdown, download a PDF copy, or securely settle the invoice online using credit card, debit card, UPI, or net banking via our authorized SabPaisa gateway.
      </p>
    `;

    const subject = `Invoice #${invoice.invoice_number} from Intrust India (₹${fmt(amountDuePaise)})`;
    const html = wrapEmailLayout({
        previewText: `New invoice #${invoice.invoice_number} for ₹${fmt(amountDuePaise)} is ready for payment.`,
        headerTitle: `New Invoice Issued`,
        headerSubtitle: `Invoice #${invoice.invoice_number} • Dated ${formatDate(invoice.invoice_date)}`,
        contentHtml,
        ctaText: `Review & Pay ₹${fmt(amountDuePaise)}`,
        ctaUrl: paymentUrl
    });

    const text = `Dear ${customerName},\n\nNew invoice #${invoice.invoice_number} for ₹${fmt(amountDuePaise)} has been generated.\n\nDue Date: ${formatDate(invoice.due_date)}\nAmount Due: ₹${fmt(amountDuePaise)}\n\nView and pay online here:\n${paymentUrl}\n\nThank you,\nIntrust India`;

    return { subject, html, text };
}

// ─── 2. Invoice Resent Template ─────────────────────────────────────────────
export function getInvoiceResentTemplate({ invoice, paymentUrl }) {
    const customerName = invoice.customer_snapshot?.name || 'Valued Customer';
    const amountDuePaise = Math.max(0, (invoice.grand_total_paise || 0) - (invoice.amount_paid_paise || 0));

    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        Dear <strong>${customerName}</strong>,
      </p>
      <p style="margin: 0 0 16px 0;">
        As requested, we are resending your invoice <strong>#${invoice.invoice_number}</strong>.
      </p>

      ${renderSummaryTable({ invoice, amountDuePaise })}

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
        Click the button below to view the invoice or complete the payment securely online.
      </p>
    `;

    const subject = `Resent: Invoice #${invoice.invoice_number} - Intrust India`;
    const html = wrapEmailLayout({
        previewText: `Here is a copy of your invoice #${invoice.invoice_number} for ₹${fmt(amountDuePaise)}.`,
        headerTitle: `Invoice #${invoice.invoice_number}`,
        headerSubtitle: `Official Invoice Copy • Amount Due: ₹${fmt(amountDuePaise)}`,
        contentHtml,
        ctaText: `View & Pay ₹${fmt(amountDuePaise)}`,
        ctaUrl: paymentUrl
    });

    const text = `Dear ${customerName},\n\nHere is your invoice #${invoice.invoice_number} for ₹${fmt(amountDuePaise)}.\n\nView and pay online:\n${paymentUrl}\n\nThank you,\nIntrust India`;

    return { subject, html, text };
}

// ─── 3. Payment Success Template ─────────────────────────────────────────────
export function getPaymentSuccessTemplate({ invoice, amountPaidPaise, paymentMode, clientTxnId, sabpaisaTxnId, paymentUrl }) {
    const customerName = invoice.customer_snapshot?.name || 'Valued Customer';
    const paidStr = fmt(amountPaidPaise || invoice.amount_paid_paise || invoice.grand_total_paise);

    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        Dear <strong>${customerName}</strong>,
      </p>
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 800; color: #065f46; font-size: 15px;">
          ✓ Payment Received in Full
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #047857;">
          Thank you! We have received your payment of <strong>₹${paidStr}</strong> for Invoice <strong>#${invoice.invoice_number}</strong>.
        </p>
      </div>

      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 16px 0; width: 100%;">
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;"><strong>Invoice Number:</strong></td>
          <td align="right" style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #1e3a5f;">${invoice.invoice_number}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;"><strong>Amount Paid:</strong></td>
          <td align="right" style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700; color: #059669;">₹${paidStr}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #64748b;"><strong>Payment Reference:</strong></td>
          <td align="right" style="padding: 12px 20px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-family: monospace; color: #475569;">${sabpaisaTxnId || clientTxnId || 'Direct Gateway'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 20px; font-size: 12px; color: #64748b;"><strong>Payment Status:</strong></td>
          <td align="right" style="padding: 12px 20px; font-size: 12px; font-weight: 800; color: #059669;">PAID IN FULL</td>
        </tr>
      </table>

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
        Your official stamped tax invoice is available for download at the link below.
      </p>
    `;

    const subject = `Payment Receipt: Invoice #${invoice.invoice_number} - Intrust India`;
    const html = wrapEmailLayout({
        previewText: `Payment confirmed for invoice #${invoice.invoice_number} (₹${paidStr}).`,
        headerTitle: `Payment Received ✓`,
        headerSubtitle: `Official Receipt for Invoice #${invoice.invoice_number}`,
        contentHtml,
        ctaText: `Download Official Invoice Receipt`,
        ctaUrl: paymentUrl
    });

    const text = `Dear ${customerName},\n\nWe have received your payment of ₹${paidStr} for Invoice #${invoice.invoice_number}.\n\nReference: ${sabpaisaTxnId || clientTxnId || 'N/A'}\nStatus: PAID IN FULL\n\nDownload your receipt:\n${paymentUrl}\n\nThank you,\nIntrust India`;

    return { subject, html, text };
}

// ─── 4. Partial Payment Template ─────────────────────────────────────────────
export function getPartialPaymentTemplate({ invoice, amountPaidPaise, balanceDuePaise, paymentUrl }) {
    const customerName = invoice.customer_snapshot?.name || 'Valued Customer';
    const paidStr = fmt(amountPaidPaise);
    const balanceStr = fmt(balanceDuePaise);

    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        Dear <strong>${customerName}</strong>,
      </p>
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 800; color: #1e40af; font-size: 15px;">
          Partial Payment Received
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #1d4ed8;">
          We have credited a payment of <strong>₹${paidStr}</strong> towards Invoice <strong>#${invoice.invoice_number}</strong>.
        </p>
      </div>

      ${renderSummaryTable({ invoice, amountDuePaise: balanceDuePaise })}

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
        The remaining balance of <strong>₹${balanceStr}</strong> can be settled anytime before the due date.
      </p>
    `;

    const subject = `Partial Payment Received: Invoice #${invoice.invoice_number} (Balance: ₹${balanceStr})`;
    const html = wrapEmailLayout({
        previewText: `Partial payment of ₹${paidStr} received for invoice #${invoice.invoice_number}.`,
        headerTitle: `Partial Payment Received`,
        headerSubtitle: `Remaining Balance Due: ₹${balanceStr}`,
        contentHtml,
        ctaText: `Pay Remaining ₹${balanceStr}`,
        ctaUrl: paymentUrl
    });

    const text = `Dear ${customerName},\n\nWe have received a partial payment of ₹${paidStr} for Invoice #${invoice.invoice_number}.\nRemaining Balance Due: ₹${balanceStr}.\n\nPay remaining balance:\n${paymentUrl}\n\nThank you,\nIntrust India`;

    return { subject, html, text };
}

// ─── 5. Payment Failed Template ─────────────────────────────────────────────
export function getPaymentFailedTemplate({ invoice, paymentUrl }) {
    const customerName = invoice.customer_snapshot?.name || 'Valued Customer';
    const amountDuePaise = Math.max(0, (invoice.grand_total_paise || 0) - (invoice.amount_paid_paise || 0));

    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        Dear <strong>${customerName}</strong>,
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 800; color: #991b1b; font-size: 15px;">
          Payment Attempt Unsuccessful
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #b91c1c;">
          Your recent online payment attempt for Invoice <strong>#${invoice.invoice_number}</strong> could not be completed by your issuing bank or payment provider.
        </p>
      </div>

      <p style="margin: 0 0 16px 0;">
        No funds were debited, or if an amount was deducted by your bank, it will be automatically reversed within 3–5 working days according to standard banking regulations.
      </p>

      ${renderSummaryTable({ invoice, amountDuePaise })}

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
        Your invoice remains active and payable. Please try again using another card, UPI ID, or net banking option.
      </p>
    `;

    const subject = `Payment Notice: Invoice #${invoice.invoice_number} - Intrust India`;
    const html = wrapEmailLayout({
        previewText: `Payment attempt for invoice #${invoice.invoice_number} was unsuccessful.`,
        headerTitle: `Payment Not Completed`,
        headerSubtitle: `Invoice #${invoice.invoice_number} • Outstanding: ₹${fmt(amountDuePaise)}`,
        contentHtml,
        ctaText: `Retry Payment (₹${fmt(amountDuePaise)})`,
        ctaUrl: paymentUrl
    });

    const text = `Dear ${customerName},\n\nYour recent payment attempt for Invoice #${invoice.invoice_number} was unsuccessful. Your invoice remains active and payable.\n\nRetry payment online:\n${paymentUrl}\n\nThank you,\nIntrust India`;

    return { subject, html, text };
}

// ─── 6. Due Soon Reminder Template ──────────────────────────────────────────
export function getDueSoonReminderTemplate({ invoice, paymentUrl }) {
    const customerName = invoice.customer_snapshot?.name || 'Valued Customer';
    const amountDuePaise = Math.max(0, (invoice.grand_total_paise || 0) - (invoice.amount_paid_paise || 0));

    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        Dear <strong>${customerName}</strong>,
      </p>
      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 800; color: #92400e; font-size: 15px;">
          Friendly Reminder: Payment Due Soon
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #b45309;">
          This is a reminder that Invoice <strong>#${invoice.invoice_number}</strong> has an outstanding balance due on <strong>${formatDate(invoice.due_date)}</strong>.
        </p>
      </div>

      ${renderSummaryTable({ invoice, amountDuePaise })}

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
        Please settle the outstanding balance before the due date to avoid service interruption or overdue notifications.
      </p>
    `;

    const subject = `Reminder: Invoice #${invoice.invoice_number} due on ${formatDate(invoice.due_date)}`;
    const html = wrapEmailLayout({
        previewText: `Friendly reminder: Invoice #${invoice.invoice_number} is due on ${formatDate(invoice.due_date)}.`,
        headerTitle: `Payment Due Soon`,
        headerSubtitle: `Invoice #${invoice.invoice_number} • Due: ${formatDate(invoice.due_date)}`,
        contentHtml,
        ctaText: `Pay Outstanding ₹${fmt(amountDuePaise)}`,
        ctaUrl: paymentUrl
    });

    const text = `Dear ${customerName},\n\nFriendly reminder that Invoice #${invoice.invoice_number} for ₹${fmt(amountDuePaise)} is due on ${formatDate(invoice.due_date)}.\n\nPay online:\n${paymentUrl}\n\nThank you,\nIntrust India`;

    return { subject, html, text };
}

// ─── 7. Overdue Reminder Template ───────────────────────────────────────────
export function getOverdueReminderTemplate({ invoice, paymentUrl }) {
    const customerName = invoice.customer_snapshot?.name || 'Valued Customer';
    const amountDuePaise = Math.max(0, (invoice.grand_total_paise || 0) - (invoice.amount_paid_paise || 0));

    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        Dear <strong>${customerName}</strong>,
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <p style="margin: 0; font-weight: 800; color: #991b1b; font-size: 15px;">
          Important: Invoice Overdue Notice
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #b91c1c;">
          Invoice <strong>#${invoice.invoice_number}</strong> was due on <strong>${formatDate(invoice.due_date)}</strong> and is currently overdue.
        </p>
      </div>

      ${renderSummaryTable({ invoice, amountDuePaise })}

      <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
        Please clear the pending balance as soon as possible via our secure online portal. If you have already made this payment, kindly disregard this notice.
      </p>
    `;

    const subject = `Overdue Notice: Invoice #${invoice.invoice_number} - Intrust India`;
    const html = wrapEmailLayout({
        previewText: `Notice: Invoice #${invoice.invoice_number} is past due (₹${fmt(amountDuePaise)}).`,
        headerTitle: `Invoice Past Due`,
        headerSubtitle: `Invoice #${invoice.invoice_number} was due on ${formatDate(invoice.due_date)}`,
        contentHtml,
        ctaText: `Pay Overdue Amount ₹${fmt(amountDuePaise)}`,
        ctaUrl: paymentUrl
    });

    const text = `Dear ${customerName},\n\nInvoice #${invoice.invoice_number} was due on ${formatDate(invoice.due_date)} and remains unpaid. Amount due: ₹${fmt(amountDuePaise)}.\n\nPlease clear the balance:\n${paymentUrl}\n\nThank you,\nIntrust India`;

    return { subject, html, text };
}
