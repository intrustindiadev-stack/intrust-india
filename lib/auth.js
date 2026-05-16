/**
 * Display helpers for user identity — keeps pseudo-emails and raw phone
 * identifiers away from the UI layer.
 */

// Matches both the new stable format (p<10digits>@phone.intrust.internal)
// and the legacy UUID format (phone-<uuid>@intrust.internal).
export const PSEUDO_EMAIL_RE =
    /^p\d+@phone\.intrust\.internal$|^phone-[0-9a-f-]{36}@intrust\.internal$/i;

/**
 * Returns true if the email is an internal pseudo-email used for phone-only
 * users (should never be shown to end users).
 * @param {string|null|undefined} email
 * @returns {boolean}
 */
export function isPseudoEmail(email) {
    if (!email) return false;
    return /@(phone\.)?intrust\.internal$/i.test(email);
}

/**
 * Returns the email if it is a real email address, or null if it is a
 * pseudo-email / falsy.
 * @param {string|null|undefined} email
 * @returns {string|null}
 */
export function displayEmail(email) {
    if (isPseudoEmail(email)) return null;
    return email || null;
}

/**
 * Resolves the best display name for a user in priority order:
 *  1. profile.full_name (trimmed, non-empty)
 *  2. user.user_metadata.full_name (trimmed, non-empty)
 *  3. Local part of user.email — only when it is NOT a pseudo-email
 *  4. 'User' as final fallback
 *
 * @param {object|null|undefined} profile
 * @param {object|null|undefined} user   — Supabase auth user object
 * @returns {string}
 */
export function displayName(profile, user) {
    const fromProfile = profile?.full_name?.trim();
    if (fromProfile) return fromProfile;

    const fromMeta = user?.user_metadata?.full_name?.trim();
    if (fromMeta) return fromMeta;

    const email = user?.email;
    if (email && !isPseudoEmail(email)) {
        return email.split('@')[0];
    }

    return 'User';
}

/**
 * Returns the first character of displayName(profile, user), uppercased.
 * @param {object|null|undefined} profile
 * @param {object|null|undefined} user
 * @returns {string}
 */
export function displayInitial(profile, user) {
    return displayName(profile, user).charAt(0).toUpperCase();
}

/**
 * Formats an Indian phone number as "+91 XXXXXXXXXX".
 * Strips all non-digit characters, takes the last 10 digits.
 * Returns the original value unchanged if fewer than 10 digits remain.
 *
 * @param {string|null|undefined} phone
 * @returns {string|null|undefined}
 */
export function formatIndianPhone(phone) {
    if (!phone) return phone;
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length < 10) return phone;
    const last10 = digits.slice(-10);
    return `+91 ${last10}`;
}

/**
 * Redirects the authenticated user to their role-specific dashboard.
 * Handles account suspension guard before redirecting.
 *
 * Must be called client-side only (uses window and toast).
 *
 * @param {object|null|undefined} user          - Supabase auth user object
 * @param {string|null|undefined} role          - Value from user_profiles.role
 * @param {boolean}               isSuspended   - Value from user_profiles.is_suspended
 */
export async function redirectByRole(user, role, isSuspended) {
    // Lazy-import toast to avoid issues in server contexts
    const { default: toast } = await import('react-hot-toast');

    if (isSuspended === true) {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (_) { /* non-fatal */ }
        toast.error('Your account has been suspended. Please contact support.');
        return;
    }

    if (role === 'merchant') {
        window.location.href = '/merchant/dashboard';
    } else if (role === 'admin' || role === 'super_admin') {
        window.location.href = '/admin';
    } else if (role === 'hr_manager') {
        window.location.href = '/hrm';
    } else if (role?.startsWith('sales_') || role === 'sales_exec' || role === 'sales_agent') {
        window.location.href = '/crm';
    } else if (role === 'employee') {
        window.location.href = '/employee';
    } else {
        window.location.href = '/dashboard';
    }
}
