import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/customerOrders.js
 *
 * Transactional email templates for customer orders, shipping status, and store credit.
 * Pure functions returning { subject, html, text }.
 */

/**
 * Format currency in Indian Rupees.
 *
 * @param {number|string} amount
 * @returns {string}
 */
function formatRs(amount) {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Customer Order Confirmed Template
 */
export function orderConfirmedTemplate({
    customerName = 'Valued Customer',
    orderId,
    orderTotalRs = 0,
    items = [],
    deliveryAddress = '',
    actionUrl = 'https://intrustindia.com/orders',
}) {
    const shortId = (orderId || '').substring(0, 8).toUpperCase();
    const subject = `Order Confirmed #${shortId} — InTrust India`;
    const safeCustomer = escapeHtml(customerName);

    let itemsHtml = '';
    let itemsText = '';

    if (Array.isArray(items) && items.length > 0) {
        itemsHtml = `
            <table role="presentation" border="0" cellpadding="8" cellspacing="0" width="100%" style="margin: 16px 0; border-collapse: collapse; border: 1px solid #e2e8f0;">
                <tr style="background-color: #f1f5f9; text-align: left; font-size: 13px; color: #475569;">
                    <th>Item</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                </tr>
                ${items.map(item => `
                    <tr style="border-top: 1px solid #e2e8f0; font-size: 14px;">
                        <td style="color: #0f172a;">${escapeHtml(item.title || item.name || 'Product')}</td>
                        <td style="text-align: center; color: #475569;">${escapeHtml(item.quantity || 1)}</td>
                        <td style="text-align: right; font-weight: 600; color: #0f172a;">${formatRs(item.price || item.unit_price || 0)}</td>
                    </tr>
                `).join('')}
            </table>
        `;
        itemsText = items.map(i => ` - ${i.title || i.name} x${i.quantity || 1}: ₹${i.price || 0}`).join('\n');
    }

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${safeCustomer}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Thank you for your purchase! We have received your order <strong>#${escapeHtml(shortId)}</strong> and our merchant partners are preparing it for fulfillment.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Order Reference: <strong style="color: #0f172a;">#${escapeHtml(shortId)}</strong></p>
            <p style="margin: 0; font-size: 16px; color: #0f172a;">Total Paid: <strong style="color: #2563eb;">${formatRs(orderTotalRs)}</strong></p>
        </div>

        ${itemsHtml}

        ${deliveryAddress ? `
            <p style="margin: 16px 0 6px 0; font-size: 14px; color: #475569;"><strong>Delivery Address:</strong></p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; line-height: 1.4;">${escapeHtml(deliveryAddress)}</p>
        ` : ''}

        <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px;">
            You will receive another update as soon as your shipment is dispatched with tracking information.
        </p>
    `;

    const text = [
        `INTRUST INDIA — ORDER CONFIRMED`,
        `===========================================`,
        `Hello ${customerName},`,
        ``,
        `Your order #${shortId} has been confirmed.`,
        `Total Amount: ${formatRs(orderTotalRs)}`,
        itemsText ? `\nItems:\n${itemsText}` : '',
        deliveryAddress ? `\nDelivery Address:\n${deliveryAddress}` : '',
        ``,
        `Track your order: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: `Order Confirmed #${shortId}`,
            preheader: `We've confirmed your order for ${formatRs(orderTotalRs)}. Track status online.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Track Order Status',
            footerNote: 'Need help with your order? Contact orders@intrustindia.com'
        }),
        text,
    };
}

/**
 * Customer Order Status Update Template
 */
export function orderStatusUpdateTemplate({
    customerName = 'Valued Customer',
    orderId,
    newStatus,
    trackingNumber = null,
    statusNotes = '',
    actionUrl = 'https://intrustindia.com/orders',
}) {
    const shortId = (orderId || '').substring(0, 8).toUpperCase();
    const statusMap = {
        packed: { label: 'Packed & Ready', color: '#3b82f6', message: 'Your items have been carefully packed and are ready for pickup by the courier.' },
        shipped: { label: 'Shipped', color: '#8b5cf6', message: 'Your order has been handed over to our delivery partner and is on its way.' },
        out_for_delivery: { label: 'Out for Delivery', color: '#f59e0b', message: 'Your package is out for delivery today. Please keep your phone accessible.' },
        delivered: { label: 'Delivered', color: '#059669', message: 'Your package has been successfully delivered. We hope you enjoy your purchase!' },
        cancelled: { label: 'Cancelled', color: '#ef4444', message: 'Your order has been cancelled. If any payment was made, your refund has been initiated.' },
    };

    const statusInfo = statusMap[newStatus] || { label: newStatus, color: '#059669', message: `Your order status is now: ${newStatus}.` };
    const subject = `Order #${shortId} Update: ${statusInfo.label} — InTrust India`;
    const safeCustomer = escapeHtml(customerName);

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${safeCustomer}</strong>,</p>
        <p style="margin: 0 0 16px 0;">${statusInfo.message}</p>

        <div style="background-color: #f8fafc; border-left: 4px solid ${statusInfo.color}; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Order ID: <strong style="color: #0f172a;">#${escapeHtml(shortId)}</strong></p>
            <p style="margin: 0; font-size: 16px; color: #0f172a;">Current Status: <strong style="color: ${statusInfo.color};">${escapeHtml(statusInfo.label)}</strong></p>
            ${trackingNumber ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #334155;">Tracking Number / AWB: <strong style="color: #0f172a;">${escapeHtml(trackingNumber)}</strong></p>` : ''}
        </div>

        ${statusNotes ? `
            <p style="margin: 16px 0 6px 0; font-size: 14px; color: #475569;"><strong>Notes from Fulfillment:</strong></p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; font-style: italic;">"${escapeHtml(statusNotes)}"</p>
        ` : ''}
    `;

    const text = [
        `INTRUST INDIA — ORDER STATUS UPDATE`,
        `===========================================`,
        `Hello ${customerName},`,
        ``,
        `Order #${shortId} status has updated to: ${statusInfo.label}`,
        statusInfo.message,
        trackingNumber ? `Tracking Number: ${trackingNumber}` : '',
        statusNotes ? `Fulfillment Notes: ${statusNotes}` : '',
        ``,
        `View Order Details: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: `Order Update: ${statusInfo.label}`,
            preheader: `Your order #${shortId} status is now ${statusInfo.label}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Order Details',
            brandColor: statusInfo.color,
            footerNote: 'Questions regarding delivery? Contact orders@intrustindia.com'
        }),
        text,
    };
}

/**
 * Customer Store Credit (Udhari) Decision Template
 */
export function udhariDecisionTemplate({
    customerName = 'Valued Customer',
    itemTitle = 'Purchased Item',
    action = 'approve',
    days = 15,
    amountRs = 0,
    rejectionReason = '',
    actionUrl = 'https://intrustindia.com/udhari',
}) {
    const isApproved = action === 'approve';
    const subject = isApproved
        ? `Store Credit Approved for "${itemTitle}" — InTrust India`
        : `Store Credit Request Declined for "${itemTitle}" — InTrust India`;

    const bodyHtml = isApproved ? `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(customerName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Great news! Your request for deferred payment (Store Credit) for <strong>"${escapeHtml(itemTitle)}"</strong> has been approved by the merchant.
        </p>
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e40af;">Amount Deferred: <strong style="color: #1e3a8a;">${formatRs(amountRs)}</strong></p>
            <p style="margin: 0; font-size: 14px; color: #1e40af;">Repayment Window: <strong style="color: #1e3a8a;">${escapeHtml(days)} Days</strong></p>
        </div>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            Please ensure repayment is completed within ${escapeHtml(days)} days to preserve your credit limit and access to future deferred payment offers.
        </p>
    ` : `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(customerName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            The merchant was unable to approve your Store Credit request for <strong>"${escapeHtml(itemTitle)}"</strong> at this time.
        </p>
        ${rejectionReason ? `
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">Reason: <strong>${escapeHtml(rejectionReason)}</strong></p>
            </div>
        ` : ''}
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            You can still complete this purchase directly via UPI, Net Banking, or your InTrust Wallet balance.
        </p>
    `;

    const text = [
        `INTRUST INDIA — STORE CREDIT DECISION`,
        `===========================================`,
        `Hello ${customerName},`,
        ``,
        isApproved
            ? `Your Store Credit request for "${itemTitle}" was APPROVED. Amount: ${formatRs(amountRs)} due in ${days} days.`
            : `Your Store Credit request for "${itemTitle}" was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        ``,
        `Manage Store Credit: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: isApproved ? 'Store Credit Approved 🎉' : 'Store Credit Request Update',
            preheader: isApproved ? `Your deferred payment request for ${formatRs(amountRs)} is approved.` : `Update on your deferred payment request.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: isApproved ? 'View Credit Details & Pay' : 'View InTrust Store',
            brandColor: isApproved ? '#2563eb' : '#64748b'
        }),
        text,
    };
}

/**
 * Customer Store Credit Repaid Receipt Template
 */
export function udhariPaymentReceiptTemplate({
    customerName = 'Valued Customer',
    itemTitle = 'Purchased Item',
    amountRs = 0,
    paymentDate = new Date(),
    referenceId = '',
    actionUrl = 'https://intrustindia.com/udhari',
}) {
    const subject = `Store Credit Payment Receipt — ${formatRs(amountRs)} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(customerName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Thank you! Your payment of <strong>${formatRs(amountRs)}</strong> towards <strong>"${escapeHtml(itemTitle)}"</strong> has been received and confirmed.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #166534;">Amount Paid: <strong>${formatRs(amountRs)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #166534;">Status: <strong>SETTLED ✅</strong></p>
            ${referenceId ? `<p style="margin: 0; font-size: 13px; color: #475569;">Reference ID: ${escapeHtml(referenceId)}</p>` : ''}
        </div>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            Your store credit balance with this merchant has been cleared.
        </p>
    `;

    const text = [
        `INTRUST INDIA — STORE CREDIT RECEIPT`,
        `===========================================`,
        `Hello ${customerName},`,
        ``,
        `Your store credit payment of ${formatRs(amountRs)} for "${itemTitle}" has been settled.`,
        referenceId ? `Reference ID: ${referenceId}` : '',
        ``,
        `View Details: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Payment Received — Store Credit Settled',
            preheader: `Your store credit payment of ${formatRs(amountRs)} has been settled.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Credit Dashboard',
        }),
        text,
    };
}
