import { normalizePayerMobile } from './payerContactRules';

/**
 * Normalizes a phone number using length-aware logic.
 * Drops country codes or prefixes only when there are more than 10 digits.
 */
const normalizePhone = (phone) => {
    if (!phone) return null;
    const str = String(phone).trim();
    if (str.length === 0) return null;
    const normalized = normalizePayerMobile(phone);
    return normalized.length > 0 ? normalized : null;
};

/**
 * Trims a string and returns null if empty.
 */
const normalizeString = (str) => {
    if (typeof str !== 'string') return null;
    const trimmed = str.trim();
    return trimmed.length > 0 ? trimmed : null;
};

/**
 * Resolves the best available payer contact email and phone.
 * 
 * Phone values are normalized using length-aware logic (returns the last 10 digits if longer).
 * Empty strings are treated as missing.
 * 
 * @param {Object} params
 * @param {Object} params.merchant - The merchant record (merchants table)
 * @param {Object} params.profile - The user profile record (user_profiles table)
 * @param {Object} params.authUser - The authenticated user record (auth.users table)
 * @returns {{ payerEmail: string|null, payerPhone: string|null, source: { email: string|null, phone: string|null } }}
 */
export function getPayerContact({ merchant, profile, authUser }) {
    let payerEmail = null;
    let emailSource = null;

    const merchantEmail = normalizeString(merchant?.business_email);
    const profileEmail = normalizeString(profile?.email);
    const authEmail = normalizeString(authUser?.email);

    if (merchantEmail) {
        payerEmail = merchantEmail;
        emailSource = 'merchants';
    } else if (profileEmail) {
        payerEmail = profileEmail;
        emailSource = 'user_profiles';
    } else if (authEmail) {
        payerEmail = authEmail;
        emailSource = 'auth.users';
    }

    let payerPhone = null;
    let phoneSource = null;

    const merchantPhone = normalizePhone(merchant?.business_phone);
    const profilePhone = normalizePhone(profile?.phone);

    if (merchantPhone) {
        payerPhone = merchantPhone;
        phoneSource = 'merchants';
    } else if (profilePhone) {
        payerPhone = profilePhone;
        phoneSource = 'user_profiles';
    }

    return {
        payerEmail,
        payerPhone,
        source: {
            email: emailSource,
            phone: phoneSource,
        },
    };
}
