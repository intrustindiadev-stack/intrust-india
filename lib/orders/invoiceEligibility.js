/**
 * lib/orders/invoiceEligibility.js
 *
 * Centralized business logic and single source of truth for Shopping Order Invoice Eligibility.
 *
 * Lifecycle Rules:
 * 1. Payment check: Payment must be successfully completed ('paid').
 * 2. Fulfillment check: Order must reach at least the 'packed' stage
 *    (delivery_status IN ('packed', 'shipped', 'delivered')).
 * 3. Cancellation check: Order must not be cancelled
 *    (status !== 'cancelled' && delivery_status !== 'cancelled').
 */

export const INVOICE_ELIGIBLE_DELIVERY_STATUSES = Object.freeze([
    'packed',
    'shipped',
    'delivered'
]);

/**
 * Checks whether a shopping order group is eligible for a tax invoice.
 *
 * @param {object} order - The shopping order record (from shopping_order_groups)
 * @returns {boolean}
 */
export function isOrderInvoiceEligible(order) {
    if (!order) return false;

    // 1. Payment status check
    const paymentStatus = (order.payment_status || '').toLowerCase();
    if (paymentStatus !== 'paid') {
        return false;
    }

    // 2. Cancellation check
    const orderStatus = (order.status || '').toLowerCase();
    const deliveryStatus = (order.delivery_status || '').toLowerCase();
    if (orderStatus === 'cancelled' || deliveryStatus === 'cancelled' || orderStatus === 'failed') {
        return false;
    }

    // 3. Fulfillment status check
    return INVOICE_ELIGIBLE_DELIVERY_STATUSES.includes(deliveryStatus);
}

/**
 * Returns a human-readable reason why an order is not currently eligible for an invoice.
 *
 * @param {object} order - The shopping order record
 * @returns {string|null}
 */
export function getInvoiceIneligibilityReason(order) {
    if (!order) return 'Order not found';

    const orderStatus = (order.status || '').toLowerCase();
    const deliveryStatus = (order.delivery_status || '').toLowerCase();
    const paymentStatus = (order.payment_status || '').toLowerCase();

    if (orderStatus === 'cancelled' || deliveryStatus === 'cancelled') {
        return 'Tax invoices cannot be generated for cancelled orders.';
    }

    if (paymentStatus === 'failed' || orderStatus === 'failed') {
        return 'Tax invoices cannot be generated for failed orders.';
    }

    if (paymentStatus !== 'paid') {
        return 'Invoice will be available after payment is completed.';
    }

    if (!INVOICE_ELIGIBLE_DELIVERY_STATUSES.includes(deliveryStatus)) {
        return 'Invoice will be available once the order is packed by the merchant.';
    }

    return null;
}

/**
 * Generates an idempotent, canonical invoice number from an order.
 * Format: INV-YYYY-XXXXXXXX (first 8 characters of UUID uppercase)
 *
 * @param {object} order
 * @returns {string}
 */
export function getOrderInvoiceNumber(order) {
    if (!order?.id) return 'INV-UNKNOWN';
    const year = order.created_at ? new Date(order.created_at).getFullYear() : new Date().getFullYear();
    const shortId = order.id.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `INV-${year}-${shortId}`;
}
