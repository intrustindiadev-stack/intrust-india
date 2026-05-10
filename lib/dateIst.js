/**
 * lib/dateIst.js
 *
 * IST-aware date helpers. Uses Intl.DateTimeFormat instead of toDateString()
 * which is locale/timezone-dependent and produces wrong results for IST users
 * near midnight boundaries.
 */

const IST_FORMATTER = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata' });

/**
 * Returns the IST date string (e.g. "10/5/2026") for a given ISO timestamp.
 * @param {string|Date} iso
 * @returns {string}
 */
export function toISTDateString(iso) {
    return IST_FORMATTER.format(new Date(iso));
}

/**
 * Returns true when the given ISO timestamp falls on today in IST.
 * @param {string|Date} iso
 * @returns {boolean}
 */
export function isTodayIST(iso) {
    return toISTDateString(iso) === toISTDateString(new Date());
}

/**
 * Returns the number of full days elapsed since the given ISO timestamp,
 * measured in IST calendar days (not 24-hour periods).
 * Useful for "N days ago" labels.
 * @param {string|Date} iso
 * @returns {number}
 */
export function daysAgoIST(iso) {
    const todayStr = toISTDateString(new Date());
    const thenStr  = toISTDateString(iso);

    // Parse back to compare (format is DD/MM/YYYY in en-IN)
    const parse = (str) => {
        const [d, m, y] = str.split('/').map(Number);
        return new Date(y, m - 1, d).getTime();
    };

    const diff = parse(todayStr) - parse(thenStr);
    return Math.max(0, Math.round(diff / 86_400_000));
}
