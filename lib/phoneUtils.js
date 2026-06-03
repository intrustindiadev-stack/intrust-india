/**
 * Normalizes a phone number to standard 10-digit, E.164 (+91), and SMS gateway formats.
 * Handles +91, 91, or 0 prefixes, or spaces/dashes.
 * 
 * @param {string} phone - The phone number to normalize.
 * @returns {{ cleanPhone: string, formattedPhone: string, isValid: boolean }} Normalized details.
 */
export function normalizePhone(phone) {
    if (!phone) {
        return { cleanPhone: '', formattedPhone: '', isValid: false };
    }

    // Strip all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // The canonical phone is the last 10 digits
    const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;

    // Validate structure: must be 10 digits, or 11 starting with 0, or 12 starting with 91
    let isValid = false;
    if (digits.length === 10) {
        isValid = true;
    } else if (digits.length === 11 && digits.startsWith('0')) {
        isValid = true;
    } else if (digits.length === 12 && digits.startsWith('91')) {
        isValid = true;
    }

    // E.164 format: +91 followed by 10-digit number
    const formattedPhone = cleanPhone && isValid ? `+91${cleanPhone}` : '';

    return {
        cleanPhone,
        formattedPhone,
        isValid
    };
}

/**
 * Validates if the phone number matches the expected Indian format.
 * @param {string} phone - The phone number to validate.
 * @returns {boolean} True if valid.
 */
export function validatePhoneNumber(phone) {
    return normalizePhone(phone).isValid;
}

/**
 * Formats a phone number for SMSIndiaHub recipient format (91 + 10 digits).
 * @param {string} phone - The phone number to format.
 * @returns {string} The formatted number.
 */
export function formatPhoneForSMS(phone) {
    const { cleanPhone, isValid } = normalizePhone(phone);
    return cleanPhone && isValid ? `91${cleanPhone}` : '';
}

/**
 * Formats a phone number for Supabase/auth format (+91 + 10 digits).
 * @param {string} phone - The phone number to format.
 * @returns {string} The formatted number.
 */
export function formatPhoneForAuth(phone) {
    const { cleanPhone, isValid } = normalizePhone(phone);
    return cleanPhone && isValid ? `+91${cleanPhone}` : '';
}
