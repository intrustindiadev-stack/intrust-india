import { NextResponse } from 'next/server';

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow server-side.
 * Redirects browser to Google — NOT to supabase.co.
 */
export async function GET(request) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https';
    const appUrl = `${protocol}://${host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'select_account');

    const reqUrl = new URL(request.url);
    const next       = reqUrl.searchParams.get('next');
    const linkMode   = reqUrl.searchParams.get('link_mode');    // 'email' when doing account merge
    const pendingEmail = reqUrl.searchParams.get('pending_email');

    // Build state payload — always a JSON object so the callback can reliably parse it
    const statePayload = {};
    if (next)         statePayload.next         = next;
    if (linkMode)     statePayload.link_mode     = linkMode;
    if (pendingEmail) statePayload.pending_email = pendingEmail;

    if (Object.keys(statePayload).length > 0) {
        url.searchParams.set('state', encodeURIComponent(JSON.stringify(statePayload)));
    }

    return NextResponse.redirect(url.toString());
}
