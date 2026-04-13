import { createAdminClient, createServerSupabaseClient } from '@/lib/supabaseServer';

/**
 * Unified auth helper for Next.js API route handlers.
 *
 * Supports two authentication patterns used across this codebase:
 *   1. Cookie-based auth — @supabase/ssr `createServerClient` reads the
 *      `sb-<ref>-auth-token` cookie set by the browser or SSR middleware.
 *   2. Bearer token auth — `Authorization: Bearer <access_token>` header,
 *      used by programmatic callers (E2E tests, mobile apps, etc.).
 *
 * Both patterns are tried in order; whichever succeeds is returned.
 * The `admin` client (service role) is always returned for safe DB writes.
 *
 * @param {Request} request - The incoming Next.js request object
 * @returns {{ user: object|null, profile: object|null, admin: object }}
 */
export async function getAuthUser(request) {
    const admin = createAdminClient();
    let user = null;

    // ── 1. Try Bearer token (Authorization header) ──────────────────────────
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
        const { data: { user: tokenUser }, error } = await admin.auth.getUser(token);
        if (!error && tokenUser) {
            user = tokenUser;
        }
    }

    // ── 2. Fallback: Try cookie-based auth (@supabase/ssr) ──────────────────
    if (!user) {
        try {
            const supabaseAuth = await createServerSupabaseClient();
            const { data: { user: cookieUser } } = await supabaseAuth.auth.getUser();
            if (cookieUser) {
                user = cookieUser;
            }
        } catch {
            // cookie store not available (e.g. called outside request context)
        }
    }

    if (!user) {
        return { user: null, profile: null, admin };
    }

    // ── Fetch role profile ───────────────────────────────────────────────────
    const { data: profile } = await admin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return { user, profile, admin };
}
