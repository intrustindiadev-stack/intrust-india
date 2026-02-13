import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit OTP.
 * @returns {string} The 6-digit OTP.
 */
export function generateOTP() {
    // Generate a random number between 0 and 999999
    const otp = crypto.randomInt(0, 1000000);
    // Pad with leading zeros to ensure 6 digits
    return otp.toString().padStart(6, '0');
}

/**
 * Hashes an OTP using SHA-256 for secure storage.
 * @param {string} otp - The plain text OTP.
 * @returns {string} The hashed OTP.
 */
export function hashOTP(otp) {
    return crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');
}

/**
 * Validates a 10-digit Indian phone number.
 * @param {string} phone - The phone number to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
export function validatePhoneNumber(phone) {
    if (!phone) return false;
    // Remove non-digit characters
    const digits = phone.replace(/\D/g, '');
    // Check if it's 10 digits (standard) or 12 digits (with 91 prefix)
    // We strictly want 10 digits for our internal logic, so if it's 12 starting with 91, we accept it?
    // Actually, callers usually strip. But let's be safe.
    // If it's pure 10 digits, good.
    return /^[0-9]{10}$/.test(digits) || (/^91[0-9]{10}$/.test(digits));
}

/**
 * Masks a phone number for privacy, showing only the last 4 digits.
 * @param {string} phone - The phone number to mask.
 * @returns {string} The masked phone number (e.g., ******1234).
 */
export function maskPhone(phone) {
    if (!phone || phone.length < 4) {
        return phone;
    }
    const last4 = phone.slice(-4);
    return '*'.repeat(phone.length - 4) + last4;
}
