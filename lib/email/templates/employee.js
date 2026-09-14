import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/employee.js
 *
 * Transactional email templates for employees:
 * leave decisions, payslip/salary processing, and HR notifications.
 * Pure functions returning { subject, html, text }.
 */

function formatRs(amount) {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Leave Decision Alert for Employee (Approved or Rejected)
 */
export function leaveDecisionTemplate({
    employeeName,
    leaveType = 'Leave',
    fromDate,
    toDate,
    action = 'approved',
    note = '',
    remainingBalance = null,
    actionUrl = 'https://intrustindia.com/employee/leaves',
}) {
    const isApproved = action === 'approved';
    const subject = isApproved
        ? `Leave Request Approved (${leaveType}) — InTrust India`
        : `Leave Request Update (${leaveType}) — InTrust India`;

    const bodyHtml = isApproved ? `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(employeeName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Your leave request for <strong>${escapeHtml(leaveType)}</strong> from <strong>${escapeHtml(fromDate)} to ${escapeHtml(toDate)}</strong> has been <strong>approved</strong> by management.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #166534;">Status: <strong>APPROVED ✅</strong></p>
            ${remainingBalance !== null ? `<p style="margin: 0; font-size: 14px; color: #166534;">Remaining Leave Balance: <strong>${escapeHtml(remainingBalance)} days</strong></p>` : ''}
        </div>

        ${note ? `
            <p style="margin: 16px 0 6px 0; font-size: 14px; color: #475569;"><strong>Reviewer Note:</strong></p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; font-style: italic;">"${escapeHtml(note)}"</p>
        ` : ''}
    ` : `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(employeeName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Your leave request for <strong>${escapeHtml(leaveType)}</strong> from <strong>${escapeHtml(fromDate)} to ${escapeHtml(toDate)}</strong> was <strong>not approved</strong>.
        </p>

        ${note ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #991b1b;">Reason:</p>
                <p style="margin: 0; font-size: 14px; color: #7f1d1d;">${escapeHtml(note)}</p>
            </div>
        ` : ''}

        <p style="margin: 16px 0 0 0; font-size: 14px; color: #475569;">
            Please contact your reporting manager or HR team if you have any questions.
        </p>
    `;

    const text = [
        `INTRUST INDIA — LEAVE REQUEST ${action.toUpperCase()}`,
        `===========================================`,
        `Hello ${employeeName},`,
        ``,
        `Your ${leaveType} request (${fromDate} to ${toDate}) has been ${action.toUpperCase()}.`,
        remainingBalance !== null ? `Remaining Balance: ${remainingBalance} days` : '',
        note ? `Note: ${note}` : '',
        ``,
        `Employee Portal: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: isApproved ? 'Leave Request Approved 🎉' : 'Leave Request Update',
            preheader: `Your leave request for ${fromDate} to ${toDate} is ${action}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Leave Details',
            brandColor: isApproved ? '#059669' : '#64748b',
            footerNote: 'HR Department &bull; hr@intrustindia.com'
        }),
        text,
    };
}

/**
 * Salary / Payslip Processed Notification
 */
export function salaryProcessedTemplate({
    employeeName,
    monthName,
    year,
    netSalaryRs = 0,
    breakdown = {},
    actionUrl = 'https://intrustindia.com/employee/dashboard',
}) {
    const subject = `Payslip Processed: ${monthName} ${year} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(employeeName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Your salary for <strong>${escapeHtml(monthName)} ${escapeHtml(year)}</strong> has been processed successfully.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">Period: <strong style="color: #0f172a;">${escapeHtml(monthName)} ${escapeHtml(year)}</strong></p>
            <p style="margin: 0; font-size: 18px; color: #0f172a;">Net Salary Disbursed: <strong style="color: #059669; font-size: 22px;">${formatRs(netSalaryRs)}</strong></p>
        </div>

        ${breakdown && Object.keys(breakdown).length > 0 ? `
            <table role="presentation" border="0" cellpadding="6" cellspacing="0" width="100%" style="margin: 16px 0; border-collapse: collapse; font-size: 13px;">
                ${breakdown.base ? `<tr><td style="color: #64748b;">Basic Salary:</td><td style="text-align: right; font-weight: 600;">${formatRs(breakdown.base)}</td></tr>` : ''}
                ${breakdown.hra ? `<tr><td style="color: #64748b;">HRA:</td><td style="text-align: right; font-weight: 600;">${formatRs(breakdown.hra)}</td></tr>` : ''}
                ${breakdown.allowances ? `<tr><td style="color: #64748b;">Allowances:</td><td style="text-align: right; font-weight: 600;">${formatRs(breakdown.allowances)}</td></tr>` : ''}
                ${breakdown.incentive ? `<tr><td style="color: #059669;">Incentives:</td><td style="text-align: right; font-weight: 600; color: #059669;">+${formatRs(breakdown.incentive)}</td></tr>` : ''}
                ${breakdown.deductions ? `<tr><td style="color: #ef4444;">Deductions:</td><td style="text-align: right; font-weight: 600; color: #ef4444;">-${formatRs(breakdown.deductions)}</td></tr>` : ''}
            </table>
        ` : ''}

        <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748b;">
            Detailed payslips can be viewed and downloaded directly from your employee dashboard.
        </p>
    `;

    const text = [
        `INTRUST INDIA — PAYSLIP: ${monthName} ${year}`,
        `===========================================`,
        `Hello ${employeeName},`,
        ``,
        `Your salary for ${monthName} ${year} has been processed.`,
        `Net Amount: ${formatRs(netSalaryRs)}`,
        ``,
        `View Payslip: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: `Payslip: ${monthName} ${year} 💵`,
            preheader: `Your payslip for ${monthName} ${year} is ready: ${formatRs(netSalaryRs)} net.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Detailed Payslip',
            footerNote: 'Payroll & Accounts &bull; accounts@intrustindia.com'
        }),
        text,
    };
}
