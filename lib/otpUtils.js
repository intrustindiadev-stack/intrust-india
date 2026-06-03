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

import { validatePhoneNumber, normalizePhone, formatPhoneForSMS, formatPhoneForAuth } from './phoneUtils';

export { validatePhoneNumber, normalizePhone, formatPhoneForSMS, formatPhoneForAuth };

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

/**
 * Generates a stable deterministic pseudo-email for phone-only users.
 * @param {string} cleanPhone - The 10-digit phone number.
 * @returns {string} The pseudo-email.
 */
export function getStablePhoneEmail(cleanPhone) {
    return `p${cleanPhone}@phone.intrust.internal`;
}

/**
 * Checks if the given email is a pseudo-email (either new stable or legacy UUID format).
 * Re-exported from lib/auth.js — that file is the single source of truth.
 * @param {string} email - The email to check.
 * @returns {boolean} True if it is a pseudo-email.
 */
export { isPseudoEmail } from '@/lib/auth';

