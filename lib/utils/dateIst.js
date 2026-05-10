// lib/utils/dateIst.js
// IST (Asia/Kolkata) date helpers.
// Pattern mirrors: app/api/auth/email/signin/route.js → toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

/**
 * Returns a `YYYY-MM-DD` string for the given date in IST.
 * Uses 'en-CA' locale so the native format is already ISO-style.
 *
 * @param {string | Date} date
 * @returns {string} e.g. '2026-05-10'
 */
export function istDateKey(date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(date));
}

/**
 * Returns true when `date` falls on today's calendar date in IST.
 *
 * @param {string | Date} date
 * @returns {boolean}
 */
export function isTodayIST(date) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    return istDateKey(date) === today;
}

/**
 * Returns a short human-readable date label in IST, e.g. "MAY 10".
 * Used by mapTransactionToCard for the non-today fallback.
 *
 * @param {string | Date} date
 * @returns {string} e.g. 'MAY 10'
 */
export function formatShortIST(date) {
    return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: '2-digit'
    }).format(new Date(date)).toUpperCase();
}
