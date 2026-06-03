/**
 * Helper to write Supabase auth cookies onto a NextResponse.
 * Aligns cookie handling between the server and the browser client.
 * Sets httpOnly: false so the browser client (GoTrue JS) can read and rotate
 * the auth session cookies from document.cookie, avoiding session desync.
 *
 * @param {NextResponse} response - The Next.js response object to set cookies on
 * @param {Array<{name: string, value: string, options: any}>} cookiesToSet - Array of cookies provided by @supabase/ssr
 */
export function applySupabaseCookies(response, cookiesToSet) {
    cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            ...options,
            httpOnly: false, // Must be false so the browser client can read/rotate it
        });
    });
}
