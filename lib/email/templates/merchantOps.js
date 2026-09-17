import 'server-only';
import { baseEmailLayout, escapeHtml } from './layout.js';

/**
 * lib/email/templates/merchantOps.js
 *
 * Transactional email templates for merchant day-to-day operations:
 * new orders, inventory, payouts, catalog decisions, reviews, and vault withdrawals.
 * Pure functions returning { subject, html, text }.
 */

function formatRs(amount) {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * New Order Received Alert for Merchant
 */
export function newOrderReceivedTemplate({
    businessName = 'Merchant Partner',
    orderShortId = '',
    amountRs = 0,
    itemCount = 1,
    actionUrl = 'https://intrustindia.com/merchant/orders',
}) {
    const subject = `New Order Received #${orderShortId} (${formatRs(amountRs)}) — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            You have received a new customer order on InTrust India! Please prepare the order for packaging and pickup.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Order ID: <strong style="color: #0f172a;">#${escapeHtml(orderShortId)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Total Items: <strong style="color: #0f172a;">${escapeHtml(itemCount)}</strong></p>
            <p style="margin: 0; font-size: 16px; color: #0f172a;">Order Value: <strong style="color: #2563eb;">${formatRs(amountRs)}</strong></p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
            Timely fulfillment improves your merchant rating and search visibility on the platform.
        </p>
    `;

    const text = [
        `INTRUST INDIA — NEW ORDER RECEIVED`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        `You have received a new order #${orderShortId}.`,
        `Items: ${itemCount}`,
        `Order Value: ${formatRs(amountRs)}`,
        ``,
        `Manage Order: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: `New Order Received 🛒 #${orderShortId}`,
            preheader: `New order #${orderShortId} received for ${formatRs(amountRs)}. Pack and dispatch now.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Order in Merchant Panel',
        }),
        text,
    };
}

/**
 * Payout Requested Confirmation
 */
export function payoutRequestedTemplate({
    businessName = 'Merchant Partner',
    amountRs = 0,
    source = 'wallet',
    actionUrl = 'https://intrustindia.com/merchant/wallet',
}) {
    const subject = `Withdrawal Request Submitted — ${formatRs(amountRs)} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Your withdrawal request of <strong>${formatRs(amountRs)}</strong> has been received and queued for administrative approval and settlement.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Amount: <strong style="color: #2563eb;">${formatRs(amountRs)}</strong></p>
            <p style="margin: 0; font-size: 14px; color: #475569;">Source: <strong style="color: #0f172a; text-transform: capitalize;">${escapeHtml(source.replace('_', ' '))}</strong></p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b;">
            Payouts are processed to your verified bank account via automated NEFT/IMPS transfer once approved.
        </p>
    `;

    const text = [
        `INTRUST INDIA — WITHDRAWAL REQUEST SUBMITTED`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        `Your withdrawal request of ${formatRs(amountRs)} has been submitted.`,
        `Source: ${source}`,
        ``,
        `Track Status: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Withdrawal Request Submitted 💸',
            preheader: `Your withdrawal request of ${formatRs(amountRs)} is under review.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Wallet Transactions',
        }),
        text,
    };
}

/**
 * Payout Request Status Update (approved / released / rejected)
 */
export function payoutStatusUpdateTemplate({
    businessName = 'Merchant Partner',
    amountRs = 0,
    status = 'approved',
    utrReference = '',
    adminNote = '',
    isGrowthFund = false,
    actionUrl = 'https://intrustindia.com/merchant/wallet',
}) {
    const statusMap = {
        approved: {
            title: 'Payout Approved ✅',
            badge: '#059669',
            message: `Your withdrawal of ${formatRs(amountRs)} has been approved. Bank transfer is scheduled.`,
        },
        released: {
            title: 'Payment Released to Bank 💰',
            badge: '#059669',
            message: `Your payment of ${formatRs(amountRs)} has been released directly to your verified bank account.`,
        },
        rejected: {
            title: 'Payout Request Rejected ❌',
            badge: '#ef4444',
            message: `Your withdrawal request of ${formatRs(amountRs)} could not be completed.${isGrowthFund ? ' The Growth Fund is available for re-request.' : ' The amount has been credited back to your wallet.'}`,
        },
    };

    const current = statusMap[status] || statusMap.approved;
    const subject = `Payout ${status.toUpperCase()} — ${formatRs(amountRs)} — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">${current.message}</p>

        <div style="background-color: #f8fafc; border-left: 4px solid ${current.badge}; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Amount: <strong style="color: #0f172a;">${formatRs(amountRs)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #475569;">Status: <strong style="color: ${current.badge}; text-transform: uppercase;">${escapeHtml(status)}</strong></p>
            ${utrReference ? `<p style="margin: 0; font-size: 14px; color: #0f172a;">Bank UTR / Ref: <strong style="color: #2563eb;">${escapeHtml(utrReference)}</strong></p>` : ''}
        </div>

        ${adminNote ? `
            <p style="margin: 16px 0 6px 0; font-size: 14px; color: #475569;"><strong>Administrative Note:</strong></p>
            <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155; font-style: italic;">"${escapeHtml(adminNote)}"</p>
        ` : ''}
    `;

    const text = [
        `INTRUST INDIA — PAYOUT STATUS: ${status.toUpperCase()}`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        current.message,
        `Amount: ${formatRs(amountRs)}`,
        utrReference ? `UTR Reference: ${utrReference}` : '',
        adminNote ? `Admin Note: ${adminNote}` : '',
        ``,
        `View Wallet: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: current.title,
            preheader: `Update on your payout request of ${formatRs(amountRs)}. Status: ${status}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Wallet Balance',
            brandColor: current.badge,
        }),
        text,
    };
}

/**
 * Product Catalog Review Decision
 */
export function productDecisionTemplate({
    businessName = 'Merchant Partner',
    productTitle = 'Product',
    action = 'approve',
    rejectionReason = '',
    actionUrl = 'https://intrustindia.com/merchant/shopping/my-products',
}) {
    const isApproved = action === 'approve';
    const subject = isApproved
        ? `Product Approved: "${productTitle}" is Now Live — InTrust India`
        : `Product Submission Update for "${productTitle}" — InTrust India`;

    const bodyHtml = isApproved ? `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Great news! Your product submission for <strong>"${escapeHtml(productTitle)}"</strong> has been reviewed and approved by our catalog management team.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">Status: <strong>LIVE IN STOREFRONT ✅</strong></p>
        </div>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
            Customers across InTrust India can now discover, purchase, or request store credit for this product.
        </p>
    ` : `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Our catalog team reviewed your submission for <strong>"${escapeHtml(productTitle)}"</strong> and requires adjustments before it can go live.
        </p>
        ${rejectionReason ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #991b1b;">Action Required:</p>
                <p style="margin: 0; font-size: 14px; color: #7f1d1d;">${escapeHtml(rejectionReason)}</p>
            </div>
        ` : ''}
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            Please update the pricing, description, or images and resubmit for approval.
        </p>
    `;

    const text = [
        `INTRUST INDIA — PRODUCT CATALOG DECISION`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        isApproved
            ? `Your product "${productTitle}" has been APPROVED and is now live!`
            : `Your product "${productTitle}" was not approved.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
        ``,
        `Manage Products: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: isApproved ? 'Product Approved & Live 🚀' : 'Product Submission Update',
            preheader: isApproved ? `"${productTitle}" is now live in the store!` : `Update needed on "${productTitle}".`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: isApproved ? 'View Product in Merchant Panel' : 'Edit & Resubmit Product',
            brandColor: isApproved ? '#2563eb' : '#64748b'
        }),
        text,
    };
}

/**
 * Customer Store Credit Application for Merchant Review
 */
export function storeCreditRequestTemplate({
    businessName = 'Merchant Partner',
    customerName = 'Customer',
    amountRs = 0,
    itemTitle = 'Item',
    actionUrl = 'https://intrustindia.com/merchant/udhari',
}) {
    const subject = `New Store Credit Request for "${itemTitle}" (${formatRs(amountRs)}) — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            A verified customer, <strong>${escapeHtml(customerName)}</strong>, has submitted a deferred payment (Store Credit) request for <strong>"${escapeHtml(itemTitle)}"</strong>.
        </p>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e40af;">Customer: <strong style="color: #1e3a8a;">${escapeHtml(customerName)}</strong></p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #1e40af;">Requested Amount: <strong style="color: #1e3a8a;">${formatRs(amountRs)}</strong></p>
            <p style="margin: 0; font-size: 14px; color: #1e40af;">Item: <strong style="color: #1e3a8a;">${escapeHtml(itemTitle)}</strong></p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
            You can review the customer's payment history and choose whether to approve or decline the deferred payment from your Udhari dashboard.
        </p>
    `;

    const text = [
        `INTRUST INDIA — NEW STORE CREDIT REQUEST`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        `${customerName} requested Store Credit for "${itemTitle}".`,
        `Amount: ${formatRs(amountRs)}`,
        ``,
        `Review Request: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'New Store Credit Request 📋',
            preheader: `${customerName} requested ${formatRs(amountRs)} store credit for ${itemTitle}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Review Request in Dashboard',
        }),
        text,
    };
}

/**
 * New Product Review Alert for Merchant
 */
export function newReviewAlertTemplate({
    businessName = 'Merchant Partner',
    productTitle = 'Product',
    rating = 5,
    reviewerName = 'A Customer',
    comment = '',
    actionUrl = 'https://intrustindia.com/merchant/reviews',
}) {
    const stars = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
    const subject = `New ${rating}-Star Review on "${productTitle}" — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            A customer has posted a new review on your product <strong>"${escapeHtml(productTitle)}"</strong>.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 18px; color: #f59e0b; letter-spacing: 2px;">${stars} <span style="font-size: 14px; color: #475569;">(${rating}/5)</span></p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569;">By: <strong style="color: #0f172a;">${escapeHtml(reviewerName)}</strong></p>
            ${comment ? `<p style="margin: 0; font-size: 14px; color: #334155; font-style: italic;">"${escapeHtml(comment)}"</p>` : ''}
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">
            You can publish an official merchant response to this review from your merchant panel.
        </p>
    `;

    const text = [
        `INTRUST INDIA — NEW PRODUCT REVIEW`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        `New ${rating}-star review on "${productTitle}" by ${reviewerName}:`,
        comment ? `"${comment}"` : '',
        ``,
        `Reply to Review: ${actionUrl}`,
        `===========================================`,
    ].filter(Boolean).join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: `New ${rating}-Star Review ⭐`,
            preheader: `New ${rating}/5 rating posted for "${productTitle}".`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View & Reply to Review',
            brandColor: '#f59e0b',
        }),
        text,
    };
}

/**
 * Low Stock Warning for Merchant
 */
export function lowStockAlertTemplate({
    businessName = 'Merchant Partner',
    itemTitle = 'Product',
    remainingStock = 0,
    threshold = 10,
    actionUrl = 'https://intrustindia.com/merchant/inventory',
}) {
    const subject = `Low Stock Warning: "${itemTitle}" (${remainingStock} units left) — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            This is an automated inventory alert: your stock for <strong>"${escapeHtml(itemTitle)}"</strong> has fallen below the safety threshold of ${escapeHtml(threshold)} units.
        </p>

        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #92400e;">Current Remaining Units: <strong style="color: #b45309; font-size: 18px;">${escapeHtml(remainingStock)}</strong></p>
            <p style="margin: 0; font-size: 13px; color: #78350f;">Restock soon to prevent your product from going out of stock on the customer storefront.</p>
        </div>
    `;

    const text = [
        `INTRUST INDIA — LOW STOCK WARNING`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        `Your inventory for "${itemTitle}" has fallen to ${remainingStock} units.`,
        ``,
        `Update Inventory: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Low Stock Alert ⚠️',
            preheader: `Only ${remainingStock} units left for "${itemTitle}". Restock soon.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Restock Inventory Now',
            brandColor: '#f59e0b',
        }),
        text,
    };
}

/**
 * AI Orders Vault Withdrawal Decision
 */
export function vaultWithdrawalDecisionTemplate({
    businessName = 'Merchant Partner',
    amountRs = 0,
    action = 'approved',
    reason = '',
    actionUrl = 'https://intrustindia.com/merchant/wallet',
}) {
    const isApproved = action === 'approved';
    const subject = isApproved
        ? `Vault Withdrawal Approved — ${formatRs(amountRs)} — InTrust India`
        : `Vault Withdrawal Update — ${formatRs(amountRs)} — InTrust India`;

    const bodyHtml = isApproved ? `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Your AI Orders Vault withdrawal request of <strong>${formatRs(amountRs)}</strong> has been approved and credited directly to your main InTrust Wallet.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">Amount Credited: <strong>${formatRs(amountRs)}</strong></p>
        </div>
    ` : `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            Your AI Orders Vault withdrawal request of <strong>${formatRs(amountRs)}</strong> was not approved. The amount has been safely refunded to your vault balance.
        </p>
        ${reason ? `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">Reason: <strong>${escapeHtml(reason)}</strong></p>
            </div>
        ` : ''}
    `;

    const text = [
        `INTRUST INDIA — VAULT WITHDRAWAL DECISION`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        isApproved
            ? `Your AI Orders Vault withdrawal of ${formatRs(amountRs)} has been approved and credited to your wallet.`
            : `Your AI Orders Vault withdrawal of ${formatRs(amountRs)} was rejected and refunded to your vault.${reason ? ` Reason: ${reason}` : ''}`,
        ``,
        `View Wallet: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: isApproved ? 'Vault Withdrawal Approved ✅' : 'Vault Withdrawal Update',
            preheader: `Update on your vault withdrawal request for ${formatRs(amountRs)}.`,
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'View Wallet Balance',
            brandColor: isApproved ? '#2563eb' : '#64748b'
        }),
        text,
    };
}

/**
 * Account Suspended Alert
 */
export function accountSuspendedTemplate({
    businessName = 'Merchant Partner',
    actionUrl = 'https://intrustindia.com/contact',
}) {
    const subject = `Urgent: Merchant Account Status Update — InTrust India`;

    const bodyHtml = `
        <p style="margin: 0 0 16px 0;">Hello <strong>${escapeHtml(businessName)}</strong>,</p>
        <p style="margin: 0 0 16px 0;">
            This is an urgent notification that your merchant account on InTrust India has been placed on temporary hold / suspension following an administrative review.
        </p>

        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">Status: <strong>ACCOUNT SUSPENDED</strong></p>
        </div>

        <p style="margin: 0 0 16px 0; font-size: 14px; color: #334155;">
            During this period, active product listings may be hidden from the storefront and withdrawal processing paused. Please contact our support team immediately to resolve this matter.
        </p>
    `;

    const text = [
        `INTRUST INDIA — ACCOUNT SUSPENDED`,
        `===========================================`,
        `Hello ${businessName},`,
        ``,
        `Your merchant account has been placed on temporary suspension.`,
        ``,
        `Contact Support: ${actionUrl}`,
        `===========================================`,
    ].join('\n');

    return {
        subject,
        html: baseEmailLayout({
            title: 'Account Status Notice ⚠️',
            preheader: 'Important notice regarding your InTrust India merchant account status.',
            bodyHtml,
            ctaUrl: actionUrl,
            ctaLabel: 'Contact InTrust Support',
            brandColor: '#ef4444',
            footerNote: 'Urgent inquiry? Email security@intrustindia.com'
        }),
        text,
    };
}
