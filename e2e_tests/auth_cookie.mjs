/**
 * auth_cookie.mjs
 *
 * Builds auth headers for Next.js API route tests that work with BOTH auth patterns
 * used in this codebase:
 *
 * Pattern A — Cookie-based (@supabase/ssr createServerClient):
 *   Cookie: sb-<ref>-auth-token=base64-<base64url(JSON.stringify(session))>
 *
 * Pattern B — Bearer token (request.headers.get('Authorization')):
 *   Authorization: Bearer <access_token>
 *
 * We send both so that tests work regardless of the route's auth pattern.
 */

/**
 * Extract the Supabase project ref from a Supabase URL.
 * e.g. "https://bhgbylyzlwmmabegxlfc.supabase.co" → "bhgbylyzlwmmabegxlfc"
 */
function projectRef(supabaseUrl) {
    return new URL(supabaseUrl).hostname.split('.')[0];
}

/**
 * Build the Supabase SSR cookie string for @supabase/ssr v0.8+.
 * Format: sb-<ref>-auth-token=base64-<base64url(JSON.stringify(fullSession))>
 *
 * @param {object} session  - The session object from supabase.auth.signInWithPassword().data.session
 * @param {string} supabaseUrl  - e.g. process.env.NEXT_PUBLIC_SUPABASE_URL
 * @returns {string}  Cookie header value
 */
export function buildAuthCookie(session, supabaseUrl) {
    const ref   = projectRef(supabaseUrl);
    const name  = `sb-${ref}-auth-token`;
    const encoded = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
    return `${name}=${encoded}`;
}

/**
 * Build fetch headers that work with BOTH auth patterns:
 * - Cookie-based routes (createServerSupabaseClient via @supabase/ssr)
 * - Bearer token routes (manual Authorization header check)
 *
 * @param {object} session  - session from supabase.auth.signInWithPassword().data.session
 * @param {string} supabaseUrl  - e.g. process.env.NEXT_PUBLIC_SUPABASE_URL
 * @param {object} extra  - additional headers to merge in
 */
export function authHeaders(session, supabaseUrl, extra = {}) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Cookie': buildAuthCookie(session, supabaseUrl),
        ...extra,
    };
}
