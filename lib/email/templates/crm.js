import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/crm.js
 *
 * Transactional email templates for CRM and Sales operations:
 * lead assignments, conversion milestones, and task schedules.
 * Pure functions returning { subject, html, text }.
 */

/**
 * Lead Assigned Alert for Sales Representatives
 */
export function leadAssignedTemplate({
    repName,
    leadName = '',
    company = '',
    phone = '',
    count = 1,
    actionUrl = 'https://intrustindia.com/crm/leads',
}) {
    const isSingle = count === 1 && leadName;
    const subject = isSingle
        ? `New Lead Assigned: ${leadName} — InTrust CRM`
        : `${count} New Leads Assigned to You — InTrust CRM`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(repName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            ${isSingle ? `A new prospect has been assigned to your territory queue:` : `You have been assigned <strong>${escapeHtml(count)} leads</strong> in InTrust CRM.`}
        </p>

        ${isSingle ? `
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Prospect: <strong style="color: #0f172a;">${escapeHtml(leadName)}</strong></p>
                ${company ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Company: <strong style="color: #0f172a;">${escapeHtml(company)}</strong></p>` : ''}
                ${phone ? `<p style="margin: 0; font-size: 14px; color: #475569;">Phone: <strong style="color: #0f172a;">${escapeHtml(phone)}</strong></p>` : ''}
            </div>
        ` : `
            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 15px; color: #0f172a;">Total Assigned: <strong>${escapeHtml(count)} prospects</strong></p>
            </div>
        `}

        <p style="margin: 0; font-size: 14px; color: #475569;">
            Early outreach within 24 hours increases conversion rates significantly. Review your lead details in the CRM panel.
        </p>
    `;

    const text = [
        `INTRUST CRM — LEAD ASSIGNMENT`,
        `===========================================`,
        `Hello ${repName},`,
        ``,
        isSingle
            ? `New Lead Assigned: ${leadName} (${company || 'Individual'})`
            : `${count} new leads assigned to your queue.`,
        phone ? `Phone: ${phone}` : '',
        ``,
        `Open CRM: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: isSingle ? 'New Lead Assigned 🎯' : 'Batch Leads Assigned 🎯',
            preheader: isSingle ? `New lead: ${leadName} assigned to you.` : `${count} leads assigned to you.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View in CRM Panel',
            brandColor: '#3b82f6',
        }),
        text,
    };
}

/**
 * Lead Converted Milestone Alert
 */
export function leadConvertedTemplate({
    repName,
    leadName = 'Prospect',
    type = 'customer',
    actionUrl = 'https://intrustindia.com/crm/leads',
}) {
    const subject = `Lead Converted: ${leadName} is Now an Active ${type === 'merchant' ? 'Merchant' : 'Customer'}! — InTrust CRM`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Great work, <strong>${escapeHtml(repName)}</strong>!</p>
        <p style="margin: 0 0 16px 0;">
            Prospect <strong>${escapeHtml(leadName)}</strong> has been successfully converted into an active <strong>${escapeHtml(type === 'merchant' ? 'Merchant Partner' : 'Customer')}</strong> on InTrust India.
        </p>

        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 4px 0; font-size: 14px; color: #166534;">Converted Lead: <strong>${escapeHtml(leadName)}</strong></p>
            <p style="margin: 0; font-size: 14px; color: #166534;">Target: <strong>${escapeHtml(type.toUpperCase())}</strong></p>
        </div>

        <p style="margin: 0; font-size: 14px; color: #475569;">
            This conversion has been logged in your performance metrics and territory scorecard.
        </p>
    `;

    const text = [
        `INTRUST CRM — LEAD CONVERTED!`,
        `===========================================`,
        `Congratulations ${repName}!`,
        ``,
        `${leadName} has successfully converted to ${type}.`,
        ``,
        `View CRM Metrics: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Lead Converted! 🚀',
            preheader: `${leadName} is now an active ${type}. Great job!`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Lead History',
        }),
        text,
    };
}

/**
 * CRM Task Due / Assigned Alert
 */
export function taskAssignedTemplate({
    repName,
    taskTitle,
    description = '',
    dueDate = null,
    leadName = '',
    actionUrl = 'https://intrustindia.com/crm/tasks',
}) {
    const subject = `CRM Task: "${taskTitle}" — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(repName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            A task has been assigned to you in InTrust CRM:
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #8b5cf6; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #0f172a;">${escapeHtml(taskTitle)}</p>
            ${dueDate ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: #64748b;">Due Date: <strong style="color: #0f172a;">${escapeHtml(dueDate)}</strong></p>` : ''}
            ${leadName ? `<p style="margin: 0 0 6px 0; font-size: 14px; color: #64748b;">Linked Lead: <strong style="color: #0f172a;">${escapeHtml(leadName)}</strong></p>` : ''}
            ${description ? `<p style="margin: 6px 0 0 0; font-size: 14px; color: #334155;"><em>"${escapeHtml(description)}"</em></p>` : ''}
        </div>
    `;

    const text = [
        `INTRUST CRM — TASK ASSIGNED`,
        `===========================================`,
        `Hello ${repName},`,
        ``,
        `Task: ${taskTitle}`,
        dueDate ? `Due Date: ${dueDate}` : '',
        leadName ? `Linked Lead: ${leadName}` : '',
        description ? `Details: ${description}` : '',
        ``,
        `Complete Task: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'New CRM Task Assigned 📌',
            preheader: `Task "${taskTitle}" assigned to you in InTrust CRM.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Open Task in CRM',
            brandColor: '#8b5cf6',
        }),
        text,
    };
}
