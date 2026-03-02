import { NextResponse } from 'next/server';

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow server-side.
 * Redirects browser to Google — NOT to supabase.co.
 */
export async function GET(request) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const host = request.headers.get('host');
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');

    // Pass through any 'next' redirect param
    const next = new URL(request.url).searchParams.get('next');
    if (next) {
        url.searchParams.set('state', encodeURIComponent(next));
    }

    return NextResponse.redirect(url.toString());
}
