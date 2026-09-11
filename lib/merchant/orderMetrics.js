/**
 * Merchant Order Metrics & KPI Utility
 * 
 * Provides pure, authoritative business logic for:
 * 1. Date/period boundary filtering (Today, 7D, 30D, This Month, All Time)
 * 2. Total Sales calculation (excludes cancelled/failed orders)
 * 3. Orders count (valid orders only)
 * 4. Pending Orders count (actionable pending fulfillment)
 * 5. Settled Earnings calculation (strict settlement timing, excludes contingent profit)
 */

export const PERIOD_OPTIONS = [
    { key: 'all', label: 'All Time' },
    { key: 'this_month', label: 'This Month' },
    { key: '30d', label: '30 Days' },
    { key: '7d', label: '7 Days' },
    { key: 'today', label: 'Today' },
];

/**
 * Calculates start boundary for a period in IST timezone (UTC+5:30)
 * @param {string} periodKey 
 * @param {Date} [refDate] 
 * @returns {Date|null}
 */
export function getPeriodBoundary(periodKey, refDate = new Date()) {
    if (!periodKey || periodKey === 'all') return null;

    // Convert refDate to IST timestamp
    const utcTime = refDate.getTime();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(utcTime + istOffset);

    const istYear = istDate.getUTCFullYear();
    const istMonth = istDate.getUTCMonth();
    const istDay = istDate.getUTCDate();

    if (periodKey === 'today') {
        // Start of today in IST: 00:00:00.000 IST -> convert back to UTC Date
        const istStartOfToday = Date.UTC(istYear, istMonth, istDay, 0, 0, 0, 0);
        return new Date(istStartOfToday - istOffset);
    }

    if (periodKey === 'this_month') {
        // Start of 1st day of month in IST
        const istStartOfMonth = Date.UTC(istYear, istMonth, 1, 0, 0, 0, 0);
        return new Date(istStartOfMonth - istOffset);
    }

    if (periodKey === '7d') {
        return new Date(refDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    if (periodKey === '30d') {
        return new Date(refDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return null;
}

/**
 * Validates if an order falls within a period
 * @param {object} order 
 * @param {string} periodKey 
 * @param {Date} [refDate] 
 * @returns {boolean}
 */
export function isOrderInPeriod(order, periodKey, refDate = new Date()) {
    if (!periodKey || periodKey === 'all') return true;
    if (!order?.created_at) return true;

    const boundary = getPeriodBoundary(periodKey, refDate);
    if (!boundary) return true;

    const orderTime = new Date(order.created_at).getTime();
    return orderTime >= boundary.getTime();
}

/**
 * Filter orders by date period
 * @param {Array} orders 
 * @param {string} periodKey 
 * @param {Date} [refDate] 
 * @returns {Array}
 */
export function filterOrdersByPeriod(orders = [], periodKey = 'all', refDate = new Date()) {
    if (!orders || !Array.isArray(orders)) return [];
    if (periodKey === 'all') return orders;
    return orders.filter(o => isOrderInPeriod(o, periodKey, refDate));
}

/**
 * Checks if an order is a valid shopping order
 * Excludes cancelled and failed orders.
 * @param {object} order 
 * @returns {boolean}
 */
export function isValidOrder(order) {
    if (!order) return false;
    const deliveryStatus = (order.delivery_status || '').toLowerCase();
    const orderStatus = (order.status || '').toLowerCase();
    const paymentStatus = (order.payment_status || '').toLowerCase();
    const paymentMethod = (order.payment_method || '').toLowerCase();

    // Exclude cancelled/failed delivery or group status
    if (deliveryStatus === 'cancelled' || deliveryStatus === 'failed') return false;
    if (orderStatus === 'cancelled' || orderStatus === 'failed') return false;

    // Exclude abandoned gateway drafts
    if (paymentMethod === 'gateway' && paymentStatus === 'pending') return false;

    return true;
}

/**
 * Checks if an order requires merchant action
 * @param {object} order 
 * @returns {boolean}
 */
export function isPendingActionOrder(order) {
    if (!isValidOrder(order)) return false;
    const deliveryStatus = (order.delivery_status || '').toLowerCase();
    return deliveryStatus === 'pending';
}

/**
 * Checks if an order's merchant profit has been authoritatively settled
 * @param {object} order 
 * @returns {boolean}
 */
export function isSettledOrder(order) {
    if (!order) return false;
    const settlementStatus = (order.settlement_status || '').toLowerCase();
    const deliveryStatus = (order.delivery_status || '').toLowerCase();

    // Cancelled orders cannot have settled merchant earnings
    if (deliveryStatus === 'cancelled') return false;

    // 'settled', 'admin_takeover', and 'settled_zero' are terminal settled states
    return settlementStatus === 'settled' || settlementStatus === 'admin_takeover' || settlementStatus === 'settled_zero';
}

/**
 * Format paise into Indian Rupees
 * @param {number} paise 
 * @param {boolean} [showDecimals=true] 
 * @returns {string}
 */
export function formatPaise(paise, showDecimals = true) {
    const rupees = (Number(paise) || 0) / 100;
    return rupees.toLocaleString('en-IN', {
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0
    });
}

/**
 * Calculates all authoritative KPIs for merchant orders
 * @param {Array} orders - Orders already filtered or to be filtered
 * @param {string} [periodKey='all'] 
 * @param {Date} [refDate] 
 * @returns {object}
 */
export function calculateMerchantOrderKPIs(orders = [], periodKey = 'all', refDate = new Date()) {
    const periodOrders = filterOrdersByPeriod(orders, periodKey, refDate);
    const validOrders = periodOrders.filter(isValidOrder);
    const pendingOrders = periodOrders.filter(isPendingActionOrder);
    const settledOrders = periodOrders.filter(isSettledOrder);
    const cancelledOrders = periodOrders.filter(o => (o.delivery_status || '').toLowerCase() === 'cancelled');

    // 1. Total Sales: Sum of customer order values for valid orders
    const totalSalesPaise = validOrders.reduce((sum, o) => sum + (Number(o.total_amount_paise) || 0), 0);

    // 2. Orders: Number of valid orders
    const validOrdersCount = validOrders.length;
    const totalOrdersCount = periodOrders.length;

    // 3. Pending Orders: Orders needing merchant fulfillment
    const pendingOrdersCount = pendingOrders.length;

    // 4. Settled Earnings: Authoritative settled merchant profit credited to wallet
    const settledEarningsPaise = settledOrders.reduce((sum, o) => sum + (Number(o.merchant_profit_paise) || 0), 0);
    const settledOrdersCount = settledOrders.length;

    // Contingent (pending) profit awaiting fulfillment
    const contingentProfitPaise = periodOrders
        .filter(o => isValidOrder(o) && !isSettledOrder(o))
        .reduce((sum, o) => sum + (Number(o.merchant_profit_paise) || 0), 0);

    // Context strings
    const periodLabel = PERIOD_OPTIONS.find(p => p.key === periodKey)?.label || 'All Time';

    return {
        periodKey,
        periodLabel,
        totalSalesPaise,
        totalSalesFormatted: formatPaise(totalSalesPaise),
        totalSalesSubtext: `${validOrdersCount} valid order${validOrdersCount === 1 ? '' : 's'}`,

        validOrdersCount,
        totalOrdersCount,
        ordersFormatted: validOrdersCount.toString(),
        ordersSubtext: periodKey === 'all' ? 'All valid orders' : `In ${periodLabel.toLowerCase()}`,

        pendingOrdersCount,
        pendingOrdersFormatted: pendingOrdersCount.toString(),
        pendingOrdersSubtext: pendingOrdersCount > 0 ? 'Needs your action' : 'All caught up',

        settledEarningsPaise,
        settledEarningsFormatted: formatPaise(settledEarningsPaise),
        settledOrdersCount,
        settledEarningsSubtext: `${settledOrdersCount} order${settledOrdersCount === 1 ? '' : 's'} settled`,

        contingentProfitPaise,
        contingentProfitFormatted: formatPaise(contingentProfitPaise),
        cancelledOrdersCount: cancelledOrders.length,
        periodOrdersCount: periodOrders.length
    };
}
