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
