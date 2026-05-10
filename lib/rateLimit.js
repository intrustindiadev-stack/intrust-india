// lib/rateLimit.js
// Sliding-window in-memory rate limiter.
// Serverless-friendly within a single instance (no external deps).
// Works across all reward endpoints; key should be unique per user + action.

/** @type {Map<string, number[]>} */
const _store = new Map();

/**
 * Check whether a key is within the allowed rate limit.
 *
 * @param {string} key         - Unique identifier, e.g. `'scratch:<userId>'`
 * @param {{ limit: number, windowMs: number }} options
 * @returns {{ allowed: boolean, retryAfterMs: number }}
 */
export function checkRateLimit(key, { limit, windowMs }) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Retrieve existing timestamps for this key; trim expired entries.
    const timestamps = (_store.get(key) ?? []).filter(ts => ts > windowStart);

    if (timestamps.length >= limit) {
        // The oldest timestamp in the window tells us when the first slot frees up.
        const retryAfterMs = timestamps[0] - windowStart;
        _store.set(key, timestamps);
        return { allowed: false, retryAfterMs };
    }

    timestamps.push(now);
    _store.set(key, timestamps);
    return { allowed: true, retryAfterMs: 0 };
}
