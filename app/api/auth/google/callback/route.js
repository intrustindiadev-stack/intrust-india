import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Service role client to upsert user_profiles bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback entirely server-side.
 * Google redirects here (not to supabase.co), then we:
 * 1. Exchange the code for Google tokens server-side
 * 2. Use the ID token to sign in with Supabase via signInWithIdToken
 * 3. Call setSession() on a response-bound Supabase client so cookies are
 *    written directly onto the redirect response (not into Next.js headers store,
 *    which doesn't propagate to a NextResponse.redirect())
 * 4. Redirect the user to the correct page
 */
export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const host = request.headers.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;

    if (!code) {
        console.error('[Google OAuth] No code in callback');
        return NextResponse.redirect(new URL('/login?error=no_code', appUrl));
    }

    try {
        // Step 1: Exchange authorization code for Google tokens (server-side)
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${appUrl}/api/auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('[Google OAuth] Token exchange failed:', err);
            return NextResponse.redirect(new URL('/login?error=token_exchange', appUrl));
        }

        const tokenData = await tokenRes.json();
        const idToken = tokenData.id_token;
        const accessToken = tokenData.access_token;

        if (!idToken) {
            console.error('[Google OAuth] No id_token in response');
            return NextResponse.redirect(new URL('/login?error=no_id_token', appUrl));
        }

        // Step 2: Sign in with Supabase using the Google ID token
        // We use a temporary anon client here (not cookie-bound) just to get the session object
        const tempSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll: () => [],
                    setAll: () => { },
                },
            }
        );

        const { data: authData, error: authError } = await tempSupabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
            access_token: accessToken,
        });

        if (authError) {
            console.error('[Google OAuth] Supabase signInWithIdToken error:', authError.message);
            return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent(authError.message)}`, appUrl)
            );
        }

        const session = authData?.session;
        const user = authData?.user;

        if (!session || !user) {
            console.error('[Google OAuth] No session or user returned from signInWithIdToken');
            return NextResponse.redirect(new URL('/login?error=no_session', appUrl));
        }

        // Ensure the profile exists and is in sync with the latest Google data.
        // Uses upsert so newly-created users whose trigger had an exception still get a profile.
        const googlePicture =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null;
        const googleName = user.user_metadata?.full_name || user.user_metadata?.name || null;

        const { error: upsertErr } = await supabaseAdmin
            .from('user_profiles')
            .upsert(
                {
                    id: user.id,
                    full_name: googleName || 'Google User',
                    avatar_url: googlePicture,
                    email: user.email,
                    auth_provider: 'google',
                    role: 'user',
                    email_verified: true,
                    email_verified_at: new Date().toISOString(),
                },
                {
                    onConflict: 'id',
                    ignoreDuplicates: false   // always update on conflict
                }
            );

        if (upsertErr) {
            // Non-fatal — log and continue. User is authenticated, profile sync can retry later.
            console.warn('[Google OAuth] Could not upsert user profile:', upsertErr.message);
        }

        // Ensure a wallet exists for this user — safe to call every login
        // (ON CONFLICT DO NOTHING) so existing wallets are untouched.
        const { error: walletErr } = await supabaseAdmin
            .from('customer_wallets')
            .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

        if (walletErr) {
            console.warn('[Google OAuth] Could not create wallet:', walletErr.message);
        }


        // Step 3: Determine the redirect destination BEFORE building the response
        const next = state ? decodeURIComponent(state) : null;
        let redirectPath = '/dashboard';

        if (next && next.startsWith('/')) {
            redirectPath = next;
        } else {
            // Fetch role to decide where to redirect
            const { data: profile } = await tempSupabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            if (profile?.role === 'admin') {
                redirectPath = '/admin';
            } else if (profile?.role === 'merchant') {
                redirectPath = '/merchant/dashboard';
            }
        }

        // Step 4: Build the redirect response, then bind a Supabase client TO it.
        // This ensures setSession() writes cookies directly onto the response the browser receives.
        const redirectResponse = NextResponse.redirect(new URL(redirectPath, appUrl));

        const responseBoundSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll: () => [],
                    setAll: (cookiesToSet) => {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            redirectResponse.cookies.set(name, value, options);
                        });
                    },
                },
            }
        );

        // setSession() triggers the SSR client to write access_token + refresh_token cookies
        // onto the redirectResponse via the setAll handler above
        const { error: setSessionError } = await responseBoundSupabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
        });

        if (setSessionError) {
            console.error('[Google OAuth] setSession error:', setSessionError.message);
            return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent(setSessionError.message)}`, appUrl)
            );
        }

        console.log('[Google OAuth] Success. User:', user.id, '→', redirectPath);
        return redirectResponse;

    } catch (err) {
        console.error('[Google OAuth] Unexpected error:', err);
        return NextResponse.redirect(new URL('/login?error=unexpected', appUrl));
    }
}
