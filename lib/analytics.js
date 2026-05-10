/**
 * lib/analytics.js
 *
 * Minimal, dependency-free analytics helper.
 * Currently stubs to console.info (JSON-shaped, mirrors lib/logger.js).
 * Swap `_sendToBackend` for PostHog / Mixpanel / custom endpoint when ready.
 *
 * @stub — safe to ship; no external calls in production until backend wired.
 */

// ─── Named Event Constants ────────────────────────────────────────────────────
export const CARD_PILE_COUNT_ON_LOAD  = 'card_pile_count_on_load';
export const CARD_REVEALED            = 'card_revealed';
export const CARD_REVEALED_FAILED     = 'card_revealed_failed';
export const BULK_REVEAL_COMPLETED    = 'bulk_reveal_completed';

// ─── Transport stub ───────────────────────────────────────────────────────────
async function _sendToBackend(_eventName, _payload) {
    // TODO: replace with real endpoint, e.g.:
    // await fetch('/api/analytics/track', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ event: _eventName, ..._payload }),
    // });
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * trackEvent(eventName, payload)
 * Fires an analytics event. In stub mode, emits to console.info.
 *
 * @param {string} eventName - One of the exported constants or a custom string.
 * @param {Record<string, unknown>} [payload={}] - Event properties.
 */
export function trackEvent(eventName, payload = {}) {
    const envelope = {
        event: eventName,
        ts: new Date().toISOString(),
        ...payload,
    };

    // Structured console output mirrors lib/logger.js format
    console.info('[analytics]', JSON.stringify(envelope));

    // Fire-and-forget to backend (no-op until wired)
    _sendToBackend(eventName, envelope).catch(() => {/* swallow */});
}
