/**
 * Formats monetary amounts into Indian Rupee (INR) representation.
 * 
 * @param {number} amountInPaiseOrRupees - Amount to format
 * @param {boolean} isPaise - True if input amount is in paise (default: false)
 * @returns {string} Formatted currency string (e.g. ₹1,250.00)
 */
export function formatINR(amountInPaiseOrRupees, isPaise = false) {
    const rupees = isPaise ? (amountInPaiseOrRupees || 0) / 100 : (amountInPaiseOrRupees || 0);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(rupees);
}

/**
 * Strips trailing decimal zeros or formats Rs.XXXX.000000 strings cleanly into ₹X,XXX.XX.
 * 
 * @param {string} description - Raw description string from backend/RPC
 * @returns {string} Cleaned description string
 */
export function formatDescription(description) {
    if (!description || typeof description !== 'string') return description || '';
    
    // Replace patterns like "Rs. 1000.000000" or "Rs.1000.00" with "₹1,000.00"
    return description.replace(/(?:Rs\.?\s*|₹\s*)(\d+(?:\.\d+)?)/gi, (match, amountStr) => {
        const num = parseFloat(amountStr);
        if (isNaN(num)) return match;
        return formatINR(num, false);
    });
}
