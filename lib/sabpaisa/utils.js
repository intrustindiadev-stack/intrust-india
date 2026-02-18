/**
 * Formats the date to the specific format required by Sabpaisa if necessary.
 */
export const formatDate = (date) => {
    return date.toISOString(); // Adjust format based on docs
};

/**
 * Maps Sabpaisa status codes to our internal status.
 */
export const mapStatusToInternal = (statusCode) => {
    // 0000 / 0100 are common success codes, verify with docs
    const SUCCESS_CODES = ['0000', '0100', 'SUCCESS'];
    const PENDING_CODES = ['0400', 'PENDING', 'WAITING'];
    const FAILURE_CODES = ['0300', 'FAILED', 'FAILURE'];
    const ABORTED_CODES = ['0200', 'ABORTED', 'CANCELLED'];

    if (SUCCESS_CODES.includes(statusCode)) return 'SUCCESS';
    if (PENDING_CODES.includes(statusCode)) return 'PENDING';
    if (FAILURE_CODES.includes(statusCode)) return 'FAILED';
    if (ABORTED_CODES.includes(statusCode)) return 'ABORTED';

    return 'FAILED'; // Default to failed for unknown codes
};

/**
 * Generates a unique client transaction ID.
 * Format: TXN_{TIMESTAMP}_{RANDOM}
 */
export const generateClientTxnId = () => {
    return `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};
