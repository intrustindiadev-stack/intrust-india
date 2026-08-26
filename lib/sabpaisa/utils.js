/**
 * Formats the date to Sabpaisa's required format: YYYY-MM-DD HH:mm:ss
 * @param {Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/**
 * Maps Sabpaisa status codes to our internal status.
 *
 * Documented codes:
 *   0000 = gateway_success
 *   0200 = aborted
 *   0300 = failed
 *   0400 = pending (not confirmed in docs, but safe to treat as pending)
 */
export const mapStatusToInternal = (statusCode) => {
    const SUCCESS_CODES = ['0000', 'SUCCESS'];
    const PENDING_CODES = ['0400', 'PENDING', 'WAITING'];
    const FAILURE_CODES = ['0300', 'FAILED', 'FAILURE'];
    const ABORTED_CODES = ['0200', 'ABORTED', 'CANCELLED'];

    if (SUCCESS_CODES.includes(statusCode)) return 'gateway_success';
    if (PENDING_CODES.includes(statusCode)) return 'pending';
    if (FAILURE_CODES.includes(statusCode)) return 'failed';
    if (ABORTED_CODES.includes(statusCode)) return 'aborted';

    return 'failed'; // Default to failed for unknown codes
};

/**
 * Generates a unique client transaction ID.
 * Format: TXN_{TIMESTAMP}_{RANDOM}
 */
export const generateClientTxnId = () => {
    return `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

/**
 * Determines the correct dashboard/panel destination based on transaction type and user role.
 */
export const getPanelDestination = (txnId, transaction, userRole) => {
    if (userRole === 'merchant') {
        return '/merchant/dashboard';
    }

    const type = transaction?.udf1 || '';
    if (
        type.startsWith('MERCHANT_') ||
        type === 'WHOLESALE_PURCHASE' ||
        txnId?.startsWith('MSUB_') ||
        txnId?.startsWith('LKN_') ||
        txnId?.startsWith('AIG_')
    ) {
        return '/merchant/dashboard';
    }

    return '/dashboard';
};

/**
 * Determines the correct destination for a "Try Again" action based on the transaction type.
 */
export const getTryAgainDestination = (txnId, transaction, userRole) => {
    const isFallbackWallet = !transaction && txnId && txnId.startsWith('WLT_');
    const isFallbackGiftCard = !transaction && txnId && txnId.startsWith('GC_');
    const type = transaction?.udf1;

    if (type === 'GIFT_CARD' && transaction?.udf2) {
        return `/gift-cards/${transaction.udf2}`;
    } else if (type === 'GIFT_CARD' || isFallbackGiftCard) {
        return '/gift-cards';
    } else if (type === 'WALLET_TOPUP' || isFallbackWallet) {
        return '/wallet';
    } else if (type === 'MERCHANT_TOPUP') {
        return '/merchant/wallet';
    } else if (type === 'GOLD_SUBSCRIPTION') {
        return '/wallet';
    } else if (type === 'MERCHANT_SUBSCRIPTION') {
        return '/merchant/dashboard';
    } else if (type === 'MERCHANT_LOCKIN') {
        return '/merchant/lockin';
    } else if (type === 'MERCHANT_AIGROW') {
        return '/merchant/investments';
    } else if (type === 'WHOLESALE_PURCHASE') {
        return '/merchant/shopping/wholesale';
    } else if (type === 'CART_CHECKOUT') {
        return '/orders';
    }
    
    // Default fallback is their dashboard
    return getPanelDestination(txnId, transaction, userRole);
};
