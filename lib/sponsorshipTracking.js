'use client';

/**
 * Sponsorship billboard telemetry.
 *
 * Fire-and-forget beacons that let a merchant see how many people actually saw
 * their billboard and tapped through to a featured product. Everything here is
 * anonymous-safe: the API route validates the payload and the DB derives
 * sponsor_date / merchant_id from the sponsorship row.
 *
 * Never let telemetry break the page: every failure path is swallowed.
 */

const VISITOR_COOKIE = 'it_svid';
const VISITOR_TTL_DAYS = 365;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Stable first-party visitor id so a reload cannot inflate "unique reach".
 * Cookie-based only (no fingerprinting), rotated after a year.
 */
export function getVisitorId() {
    if (typeof document === 'undefined') return null;
    try {
        const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
        if (match && match[1]) return decodeURIComponent(match[1]);

        const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

        const maxAge = VISITOR_TTL_DAYS * 24 * 60 * 60;
        document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(id)}; max-age=${maxAge}; path=/; SameSite=Lax`;
        return id;
    } catch {
        return null;
    }
}

/**
 * Record one billboard event. `eventType` must be IMPRESSION or PRODUCT_CLICK.
 * Returns the promise so callers can await when they care, but callers that do
 * not await lose nothing — errors stay contained.
 */
export function trackSponsorEvent(sponsorshipId, eventType, { productId = null, metadata = {} } = {}) {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (!UUID_RE.test(String(sponsorshipId || ''))) return Promise.resolve(null);

    const payload = {
        sponsorship_id: sponsorshipId,
        event_type: eventType,
        product_id: productId && UUID_RE.test(String(productId)) ? productId : null,
        visitor_id: getVisitorId(),
        metadata: {
            ...metadata,
            path: window.location.pathname
        }
    };

    try {
        // keepalive lets the beacon survive the tab navigating away (billboard
        // product tiles open in a new tab / leave the page).
        return fetch('/api/marketing/sponsor/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => null);
    } catch {
        return Promise.resolve(null);
    }
}

/**
 * One IMPRESSION per sponsorship per browser session — a refresh-happy visitor
 * should not look like extra reach. The DB aggregates DISTINCT visitor_id, so
 * this is a courtesy guard on top of that.
 */
export function trackSponsorImpressionOnce(sponsorshipId) {
    if (typeof window === 'undefined') return;
    if (!sponsorshipId) return;
    try {
        const key = `it_sp_imp_${sponsorshipId}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
    } catch {
        // sessionStorage blocked (private mode) — fall through and count once per mount
    }
    trackSponsorEvent(sponsorshipId, 'IMPRESSION');
}
