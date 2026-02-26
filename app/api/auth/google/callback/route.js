import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

/**
 * GET /api/auth/google/callback
 * Handles the Google OAuth callback entirely server-side.
 * Google redirects here (not to supabase.co), then we:
 * 1. Exchange the code for Google tokens server-side
 * 2. Use the ID token to sign in with Supabase (server-side, bypasses ISP block)
 * 3. Set the session cookie and redirect the user
 */
export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://intrustindia.com';

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

        if (!idToken) {
            console.error('[Google OAuth] No id_token in response');
            return NextResponse.redirect(new URL('/login?error=no_id_token', appUrl));
        }

        // Step 2: Sign in with Supabase using the Google ID token (server-to-server)
        const supabase = await createServerSupabaseClient();

        const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
        });

        if (authError) {
            console.error('[Google OAuth] Supabase signInWithIdToken error:', authError.message);
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(authError.message)}`, appUrl));
        }

        const user = authData?.user;
        if (!user) {
            return NextResponse.redirect(new URL('/login?error=no_user', appUrl));
        }

        // Step 3: Determine redirect based on role
        const next = state ? decodeURIComponent(state) : null;
        if (next && next.startsWith('/')) {
            return NextResponse.redirect(new URL(next, appUrl));
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

        if (profile?.role === 'admin') {
            return NextResponse.redirect(new URL('/admin', appUrl));
        }
        if (profile?.role === 'merchant') {
            return NextResponse.redirect(new URL('/merchant/dashboard', appUrl));
        }

        return NextResponse.redirect(new URL('/dashboard', appUrl));

    } catch (err) {
        console.error('[Google OAuth] Unexpected error:', err);
        return NextResponse.redirect(new URL('/login?error=unexpected', appUrl));
    }
}
