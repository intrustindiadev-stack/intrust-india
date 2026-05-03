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
 * Parse the OAuth state parameter.
 * Supports both the legacy plain-string format (just a redirect path)
 * and the new JSON object format { next, link_mode, pending_email }.
 */
function parseState(raw) {
    if (!raw) return {};
    try {
        const decoded = decodeURIComponent(raw);
        // JSON object — new format
        if (decoded.startsWith('{')) return JSON.parse(decoded);
        // Legacy format — plain redirect path
        return { next: decoded };
    } catch {
        return {};
    }
}

/**
 * Issue a session for a given user by creating a magic sign-in token
 * via the admin API, then exchanging it for a full session.
 */
async function issueSessionForUser(userId, redirectResponse) {
    const { data: linkData, error: linkErr } =
        await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: '',   // not needed — we'll use a different approach
        });
    // generateLink doesn't work without email. Use createSession instead.
    const { data: sessionData, error: sessionErr } =
        await supabaseAdmin.auth.admin.createSession(userId, { data: {} });

    if (sessionErr || !sessionData?.session) {
        console.error('[Google OAuth] Could not create session for merged user:', sessionErr?.message);
        return null;
    }
    return sessionData.session;
}

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback entirely server-side.
 * Google redirects here (not to supabase.co), then we:
 * 1. Exchange the code for Google tokens server-side
 * 2. Use the ID token to sign in with Supabase via signInWithIdToken
 * 3. Detect and merge duplicate accounts (Flow B)
 * 4. If link_mode=email is in state, add password to existing Google user (Flow A)
 * 5. Call setSession() on a response-bound Supabase client so cookies are
 *    written directly onto the redirect response
 * 6. Redirect the user to the correct page
 */
export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code  = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const host  = request.headers.get('host') || 'localhost:3000';
    const protocol = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https';
    const appUrl   = `${protocol}://${host}`;

    if (!code) {
        console.error('[Google OAuth] No code in callback');
        return NextResponse.redirect(new URL('/login?error=no_code', appUrl));
    }

    // Parse state
    const stateData    = parseState(state);
    const linkMode     = stateData.link_mode;     // 'email' → account merge Flow A
    const pendingEmail = stateData.pending_email; // email the user typed before clicking Google link
    const nextPath     = stateData.next;

    try {
        // ── Step 1: Exchange authorization code for Google tokens ─────────────────
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id:     process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri:  `${appUrl}/api/auth/google/callback`,
                grant_type:    'authorization_code',
            }),
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('[Google OAuth] Token exchange failed:', err);
            return NextResponse.redirect(new URL('/login?error=token_exchange', appUrl));
        }

        const tokenData   = await tokenRes.json();
        const idToken     = tokenData.id_token;
        const accessToken = tokenData.access_token;

        if (!idToken) {
            console.error('[Google OAuth] No id_token in response');
            return NextResponse.redirect(new URL('/login?error=no_id_token', appUrl));
        }

        // ── Step 2: Sign in with Supabase using the Google ID token ───────────────
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
            token:        idToken,
            access_token: accessToken,
        });

        if (authError) {
            console.error('[Google OAuth] Supabase signInWithIdToken error:', authError.message);
            return NextResponse.redirect(
                new URL(`/login?error=${encodeURIComponent(authError.message)}`, appUrl)
            );
        }

        let session = authData?.session;
        let user    = authData?.user;

        if (!session || !user) {
            console.error('[Google OAuth] No session or user returned from signInWithIdToken');
            return NextResponse.redirect(new URL('/login?error=no_session', appUrl));
        }

        const googleEmail   = user.email?.toLowerCase();
        const googlePicture = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        const googleName    = user.user_metadata?.full_name  || user.user_metadata?.name || null;

        // ── Flow A: link_mode=email — user proved Google ownership, now merge ─────
        // The user had a Google account and wanted to add email+password.
        // The password is stored in sessionStorage on the client and will be
        // submitted to /api/auth/email/link-after-google after redirect.
        // Here we just need to set auth_provider = 'multiple' and redirect to a
        // special page that completes the link.
        if (linkMode === 'email') {
            // Update user_profiles: mark as multiple providers
            await supabaseAdmin
                .from('user_profiles')
                .update({ auth_provider: 'multiple' })
                .eq('id', user.id);

            // Audit log
            try {
                await supabaseAdmin.from('audit_logs').insert({
                    user_id:  user.id,
                    action:   'account_linked',
                    metadata: { method: 'google_verify_for_email_link', email: googleEmail }
                });
            } catch (_) { /* non-fatal */ }

            // Redirect to the link-completion page where the client will submit the password
            const linkCompleteUrl = new URL('/api/auth/google/callback', appUrl);
            // Fall through to set session and redirect to /link-complete
            const redirectPath = '/link-complete';
            const redirectResp = NextResponse.redirect(new URL(redirectPath, appUrl));
            const rbSupabase   = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    cookies: {
                        getAll: () => [],
                        setAll: (cookiesToSet) => {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                redirectResp.cookies.set(name, value, options)
                            );
                        },
                    },
                }
            );
            await rbSupabase.auth.setSession({
                access_token:  session.access_token,
                refresh_token: session.refresh_token,
            });
            console.log('[Google OAuth][Flow A] Merged Google user:', user.id, '→ /link-complete');
            return redirectResp;
        }

        // ── Flow B: Normal Google sign-in — check for existing email account ──────
        // After signInWithIdToken, check if a *different* Supabase user already
        // exists with the same email and provider = 'email' (or 'phone_otp').
        const { data: existingProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id, auth_provider, full_name')
            .eq('email', googleEmail)
            .neq('id', user.id)                  // must be a different user
            .in('auth_provider', ['email', 'phone_otp', 'multiple'])
            .maybeSingle();

        if (existingProfile) {
            // ── Merge: keep the email-based user, delete the new Google duplicate ──
            const survivingId = existingProfile.id;
            console.log('[Google OAuth][Flow B] Detected duplicate. Merging Google user', user.id, '→ email user', survivingId);

            // 1. Update the surviving user's Supabase auth record to include the
            //    Google identity (add google as additional provider).
            //    Supabase admin updateUserById can add app_metadata identities.
            await supabaseAdmin.auth.admin.updateUserById(survivingId, {
                app_metadata: { provider: 'google', providers: ['email', 'google'] },
                email_verified: true,
            });

            // 2. Update user_profiles for the surviving user
            await supabaseAdmin
                .from('user_profiles')
                .update({
                    auth_provider:      'multiple',
                    avatar_url:         googlePicture || undefined,
                    email_verified:     true,
                    email_verified_at:  new Date().toISOString(),
                })
                .eq('id', survivingId);

            // 3. Delete the freshly-created Google-only duplicate user
            //    (do this BEFORE writing any data to it)
            try {
                await supabaseAdmin.auth.admin.deleteUser(user.id);
                console.log('[Google OAuth][Flow B] Deleted duplicate Google user:', user.id);
            } catch (delErr) {
                console.warn('[Google OAuth][Flow B] Could not delete duplicate user:', delErr?.message);
            }

            // 4. Audit log
            try {
                await supabaseAdmin.from('audit_logs').insert({
                    user_id:  survivingId,
                    action:   'account_linked',
                    metadata: {
                        method:           'google_merged_into_email',
                        google_user_id:   user.id,
                        surviving_id:     survivingId,
                        email:            googleEmail,
                    }
                });
            } catch (_) { /* non-fatal */ }

            // 5. Issue a new session for the surviving (merged) user.
            //    generateLink produces a one-time sign-in URL; we extract the
            //    token_hash and exchange it for a real session via verifyOtp.
            const { data: linkData, error: linkErr } =
                await supabaseAdmin.auth.admin.generateLink({
                    type:             'magiclink',
                    email:            googleEmail,
                    options:          { redirectTo: `${appUrl}/dashboard` },
                });

            if (linkErr || !linkData?.properties?.hashed_token) {
                console.error('[Google OAuth][Flow B] Could not generate link for merged user:', linkErr?.message);
                // Graceful fallback — send user to login with a helpful notice
                return NextResponse.redirect(new URL('/login?merged=true', appUrl));
            }

            // Exchange the one-time token for a real session using a disposable anon client
            const exchangeClient = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                { cookies: { getAll: () => [], setAll: () => {} } }
            );

            const { data: otpData, error: otpErr } = await exchangeClient.auth.verifyOtp({
                email:      googleEmail,
                token:      linkData.properties.hashed_token,
                type:       'magiclink',
            });

            if (otpErr || !otpData?.session) {
                console.error('[Google OAuth][Flow B] verifyOtp failed for merged user:', otpErr?.message);
                return NextResponse.redirect(new URL('/login?merged=true', appUrl));
            }

            session = otpData.session;
            user    = otpData.user ?? otpData.session.user;
        } else {
            // No duplicate — normal Google sign-in. Check if profile exists first to avoid overwriting role
            const { data: currentProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('role, auth_provider')
                .eq('id', user.id)
                .maybeSingle();

            if (currentProfile) {
                // Only update non-critical fields
                await supabaseAdmin
                    .from('user_profiles')
                    .update({
                        full_name:        googleName || 'Google User',
                        avatar_url:       googlePicture,
                        email_verified:   true,
                        email_verified_at: new Date().toISOString(),
                    })
                    .eq('id', user.id);
            } else {
                // New Google user, insert profile
                const { error: insertErr } = await supabaseAdmin
                    .from('user_profiles')
                    .insert({
                        id:               user.id,
                        full_name:        googleName || 'Google User',
                        avatar_url:       googlePicture,
                        email:            user.email,
                        auth_provider:    'google',
                        role:             'user',
                        email_verified:   true,
                        email_verified_at: new Date().toISOString(),
                    });

                if (insertErr) {
                    console.warn('[Google OAuth] Could not insert user profile:', insertErr.message);
                }
            }
        }

        // Ensure a wallet exists for the surviving user
        const { error: walletErr } = await supabaseAdmin
            .from('customer_wallets')
            .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true });

        if (walletErr) {
            console.warn('[Google OAuth] Could not create wallet:', walletErr.message);
        }

        // ── Step 3: Determine redirect path ──────────────────────────────────────
        let redirectPath = '/dashboard';
        if (nextPath && nextPath.startsWith('/')) {
            redirectPath = nextPath;
        } else {
            const { data: profile } = await supabaseAdmin
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle();

            if (profile?.role === 'admin' || profile?.role === 'super_admin') redirectPath = '/admin';
            else if (profile?.role === 'merchant') redirectPath = '/merchant/dashboard';
            else if (profile?.role === 'hr' || profile?.role === 'hr_manager') redirectPath = '/hrm';
            else if (profile?.role?.startsWith('sales_') || profile?.role === 'sales_exec' || profile?.role === 'sales_agent') redirectPath = '/crm';
            else if (profile?.role === 'employee') redirectPath = '/employee';
        }

        // ── Step 4: Build redirect response and set session cookies ──────────────
        const redirectResponse = NextResponse.redirect(new URL(redirectPath, appUrl));

        const responseBoundSupabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll: () => [],
                    setAll: (cookiesToSet) => {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            redirectResponse.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { error: setSessionError } = await responseBoundSupabase.auth.setSession({
            access_token:  session.access_token,
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
