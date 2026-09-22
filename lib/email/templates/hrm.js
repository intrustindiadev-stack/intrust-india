import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/hrm.js
 *
 * Transactional email templates for Human Resources Management:
 * leave requests to HR, candidate onboarding, and hiring notices.
 * Pure functions returning { subject, html, text }.
 */

/**
 * New Leave Application Alert for HR Managers
 */
export function leaveApplicationAdminTemplate({
    employeeName,
    department = 'General',
    leaveType = 'Leave',
    fromDate,
    toDate,
    reason = '',
    actionUrl = 'https://intrustindia.com/hrm/leaves',
}) {
    const subject = `[HR Alert] New Leave Request: ${employeeName || 'Employee'} (${leaveType}) — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello HR Manager,</p>
        <p style="margin: 0 0 16px 0;">
            An employee has submitted a new leave application awaiting your review and approval:
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Employee: <strong style="color: #0f172a;">${escapeHtml(employeeName)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Department: <strong style="color: #0f172a;">${escapeHtml(department)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Leave Type: <strong style="color: #0f172a; text-transform: capitalize;">${escapeHtml(leaveType)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Dates: <strong style="color: #0f172a;">${escapeHtml(fromDate)} to ${escapeHtml(toDate)}</strong></p>
            ${reason ? `<p style="margin: 0; font-size: 14px; color: #334155;">Reason: <em>"${escapeHtml(reason)}"</em></p>` : ''}
        </div>

        <p style="margin: 0; font-size: 14px; color: #475569;">
            Please review the team leave calendar and balance before taking action.
        </p>
    `;

    const text = [
        `[HR ALERT] NEW LEAVE REQUEST`,
        `===========================================`,
        `Employee: ${employeeName}`,
        `Department: ${department}`,
        `Type: ${leaveType}`,
        `Duration: ${fromDate} to ${toDate}`,
        reason ? `Reason: ${reason}` : '',
        ``,
        `Review in HRM: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'New Leave Application 🏖️',
            preheader: `Leave request from ${employeeName} (${fromDate} to ${toDate}).`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Review in HRM Portal',
            brandColor: '#3b82f6',
        }),
        text,
    };
}

/**
 * Candidate Hired & Onboarding Welcome Packet
 */
export function candidateHiredWelcomeTemplate({
    candidateName,
    jobTitle = 'Team Member',
    department = 'Operations',
    joiningDate = 'Immediate',
    tempPassword = '',
    actionUrl = 'https://intrustindia.com/auth/login',
}) {
    const subject = `Welcome to InTrust India! Offer & Onboarding Details — ${candidateName}`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Dear <strong>${escapeHtml(candidateName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Congratulations! We are thrilled to welcome you to the InTrust India family as <strong>${escapeHtml(jobTitle)}</strong> in the <strong>${escapeHtml(department)}</strong> department.
        </p>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e40af;">Role: <strong style="color: #1e3a8a;">${escapeHtml(jobTitle)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e40af;">Department: <strong style="color: #1e3a8a;">${escapeHtml(department)}</strong></p>
            <p style="margin: 0; font-size: 14px; color: #1e40af;">Joining Date: <strong style="color: #1e3a8a;">${escapeHtml(joiningDate)}</strong></p>
        </div>

        ${tempPassword ? `
            <div style="background-color: #f8fafc; border: 1px dashed #94a3b8; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 6px 0; font-size: 13px; text-transform: uppercase; font-weight: 600; color: #475569;">Your Employee Portal Access:</p>
                <p style="margin: 0 0 4px 0; font-size: 14px; color: #0f172a;">Portal URL: <a href="${actionUrl}" style="color: #2563eb; font-weight: 600;">${actionUrl}</a></p>
                <p style="margin: 0; font-size: 14px; color: #0f172a;">Temporary Password: <strong style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${escapeHtml(tempPassword)}</strong></p>
            </div>
            <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b;">
                * Please log in and change your password upon your first sign-in.
            </p>
        ` : ''}

        <p style="margin: 0; font-size: 14px; color: #334155;">
            Our HR operations team will reach out with the onboarding schedule and documentation checklist.
        </p>
    `;

    const text = [
        `WELCOME TO INTRUST INDIA!`,
        `===========================================`,
        `Dear ${candidateName},`,
        ``,
        `We are thrilled to welcome you as ${jobTitle} (${department}).`,
        `Joining Date: ${joiningDate}`,
        tempPassword ? `Temporary Password: ${tempPassword}` : '',
        ``,
        `Login to Employee Portal: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Welcome to InTrust India! 🎉',
            preheader: `Congratulations ${candidateName}! Welcome to your new role as ${jobTitle}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Access Employee Portal',
            footerNote: 'Questions about onboarding? Contact hr@intrustindia.com'
        }),
        text,
    };
}
