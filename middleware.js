import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Maps a role to its home portal path
function portalForRole(role) {
    if (!role) return '/dashboard';
    if (role === 'admin' || role === 'super_admin') return '/admin';
    if (role === 'merchant') return '/merchant/dashboard';
    if (role === 'hr_manager') return '/hrm';
    if (['employee', 'freelancer', 'video_editor', 'social_media_manager', 'seo_specialist', 'advertiser', 'support_agent'].includes(role)) return '/employee';
    if (role === 'relationship_exec' || role === 'relationship_manager') return '/crm';
    return '/dashboard'; // customer or unknown
}

// Protected paths that require authentication
const PROTECTED_PREFIXES = [
    '/dashboard',
    '/orders',
    '/profile',
    '/wallet',
    '/transactions',
    '/wishlist',
    '/refer',
    '/rewards',
    '/my-giftcards',
    '/merchant',
    '/admin',
    '/crm',
    '/employee',
    '/hrm',
]

// Maps portal prefix → role checker function
// These portals enforce strict role checking at middleware level.
// /dashboard now included: non-customer roles are redirected at the Edge
// before any HTML is served, eliminating the "role flash" race condition.
const PORTAL_ROLE_MAP = {
    '/admin':    (r) => r === 'admin' || r === 'super_admin',
    '/merchant': (r) => r === 'merchant',
    '/hrm':      (r) => r === 'hr_manager',
    '/crm':      (r) => r === 'relationship_exec' || r === 'relationship_manager',
    '/employee': (r) => [
        'employee', 'freelancer', 'video_editor', 'social_media_manager',
        'seo_specialist', 'advertiser', 'support_agent',
        'relationship_exec', 'relationship_manager', 
        'hr_manager', 'admin', 'super_admin'
    ].includes(r),
    '/dashboard': (r) => !r || r === 'user' || r === 'customer',
}

export async function middleware(request) {
    const requestHeaders = new Headers(request.headers);
    // Expose pathname to server components via custom header
    requestHeaders.set('x-current-path', request.nextUrl.pathname);

    let response = NextResponse.next({
        request: { headers: requestHeaders },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        return response
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const pathname = request.nextUrl.pathname

    const isWebhook = pathname.startsWith('/api/sabpaisa/') || pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/whatsapp/webhook');

    // ─── Skip auth logic for payment callbacks and webhooks ───────────────────
    // When a payment gateway POSTs to our callback URL, the browser does not
    // send SameSite=Lax cookies. If we call getSession() here with empty cookies,
    // the Supabase client writes empty cookies to the response, effectively logging
    // the user out. Bypassing middleware auth preserves the session.
    if (pathname.startsWith('/payment/') || isWebhook) {
        return response;
    }

    // ─── Read session from cookie (NO network call, instant) ─────────────────
    // getSession() reads the JWT stored in the HTTP-only cookie by Supabase SSR.
    // This is instant and never causes false-logouts due to Supabase/network timeouts.
    //
    // getUser() (old approach) makes a live HTTPS request to Supabase on EVERY page
    // load — a timeout causes middleware to see user=null and wrongly redirect to /login.
    //
    // The layout-level getUser() still handles full server-side token verification
    // after the page renders.
    let session = null;
    let userRole = null;
    let isSuspended = false;

    // ─── AUTH_DIAG: Chunk-level cookie diagnostic ────────────────────────────
    // Logs ONLY metadata — never cookie values, JWTs, or tokens.
    // Covers every protected path to answer:
    //   1. Did the browser send the auth cookie?
    //   2. Did the browser send BOTH chunks (.0 and .1)?
    //   3. Did getSession() successfully reconstruct/validate the session?
    //   4. If getSession() failed, what error did Supabase report?
    //   5. Did the middleware response issue Max-Age=0 deletion cookies?
    const COOKIE_BASE = 'sb-intrustindia-auth-token';
    const incomingCookies = request.cookies.getAll();
    const cookieNames = incomingCookies.map(c => c.name);
    const diagChunk0 = cookieNames.includes(`${COOKIE_BASE}.0`);
    const diagChunk1 = cookieNames.includes(`${COOKIE_BASE}.1`);
    const diagCookieHeaderPresent = request.headers.has('cookie');
    const diagCookieCount = incomingCookies.length;
    const diagUA = request.headers.get('user-agent') || 'unknown';
    // ────────────────────────────────────────────────────────────────────────────

    let sessionError = null;
    try {
        const { data, error } = await supabase.auth.getSession()
        session = data?.session ?? null
        sessionError = error ?? null
        userRole = session?.user?.user_metadata?.role ?? null
        isSuspended = session?.user?.user_metadata?.is_suspended ?? false
    } catch (err) {
        // Cookie reading should never fail, but if it does — do NOT redirect.
        // Fail safe: let the request through; the layout will re-verify.
        console.warn('[MIDDLEWARE] getSession error, passing through:', err?.message)

        console.log('[AUTH_DIAG]', {
            path: pathname,
            ua: diagUA.substring(0, 120),
            cookieHeaderPresent: diagCookieHeaderPresent,
            cookieCount: diagCookieCount,
            chunk0: diagChunk0,
            chunk1: diagChunk1,
            sessionSuccess: false,
            userPresent: false,
            sessionError: err?.message ?? 'thrown',
            deletionCookieIssued: 'N/A (threw before setAll)',
        });

        return response
    }

    // Determine whether supabase.auth.getSession() caused a Max-Age=0 deletion
    // to be queued on the response via setAll(). We check this AFTER getSession()
    // completes, by inspecting what cookies the middleware response now carries.
    const responseCookies = response.cookies.getAll();
    const deletionChunk0 = responseCookies.some(
        c => c.name === `${COOKIE_BASE}.0` && (c.maxAge === 0 || c.value === '')
    );
    const deletionChunk1 = responseCookies.some(
        c => c.name === `${COOKIE_BASE}.1` && (c.maxAge === 0 || c.value === '')
    );

    // Emit the AUTH_DIAG log for ALL protected paths (isProtected check below
    // happens after this, so we log for every path including public ones).
    console.log('[AUTH_DIAG]', {
        path: pathname,
        ua: diagUA.substring(0, 120),
        cookieHeaderPresent: diagCookieHeaderPresent,
        cookieCount: diagCookieCount,
        chunk0: diagChunk0,
        chunk1: diagChunk1,
        sessionSuccess: !!session,
        userPresent: !!session?.user,
        sessionError: sessionError ? (sessionError.message ?? sessionError.status ?? 'error') : null,
        deletionChunk0,
        deletionChunk1,
    });
    // ────────────────────────────────────────────────────────────────────────────

    const user = session?.user ?? null

    // ─── CSRF Protection ───────────────────────────────────────────────────────
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
    const identity = user ? user.id : 'anonymous';
    const secret = process.env.CSRF_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fallback_secret';

    async function computeCsrfSignature(randomValue) {
        const encoder = new TextEncoder();
        const message = `${identity}:${randomValue}`;
        const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
        return Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (isMutation && !isWebhook) {
        // Strict Origin/Referer Validation (Fallback)
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');
        const allowedHosts = ['intrustindia.com', 'www.intrustindia.com'];
        
        let isValidOrigin = false;
        if (origin) {
            try { 
                const host = new URL(origin).hostname;
                isValidOrigin = allowedHosts.includes(host) || host === 'localhost'; 
            } catch (e) {}
        } else if (referer) {
            try { 
                const host = new URL(referer).hostname;
                isValidOrigin = allowedHosts.includes(host) || host === 'localhost'; 
            } catch (e) {}
        }

        if (!isValidOrigin && process.env.NODE_ENV === 'production') {
            return new NextResponse(JSON.stringify({ error: 'CSRF Origin Validation Failed' }), { status: 403, headers: { 'Content-Type': 'application/json' }});
        }

        // Token Validation
        const tokenHeader = request.headers.get('x-csrf-token');
        const tokenCookie = request.cookies.get('csrf_token')?.value;

        if (!tokenHeader || !tokenCookie || tokenHeader !== tokenCookie) {
            return new NextResponse(JSON.stringify({ error: 'CSRF Token Validation Failed' }), { status: 403, headers: { 'Content-Type': 'application/json' }});
        }

        // Signature Validation
        const [randomValue, signature] = tokenHeader.split('.');
        if (!randomValue || !signature) {
            return new NextResponse(JSON.stringify({ error: 'Invalid CSRF Token Format' }), { status: 403, headers: { 'Content-Type': 'application/json' }});
        }
        
        const expectedSignature = await computeCsrfSignature(randomValue);
        if (signature !== expectedSignature) {
            return new NextResponse(JSON.stringify({ error: 'CSRF Signature Validation Failed' }), { status: 403, headers: { 'Content-Type': 'application/json' }});
        }
    } else if (request.method === 'GET' && !isWebhook) {
        // Check if token exists and is valid for CURRENT identity
        let needsNewToken = true;
        const tokenCookie = request.cookies.get('csrf_token')?.value;
        if (tokenCookie) {
            const [randomValue, signature] = tokenCookie.split('.');
            if (randomValue && signature) {
                const expectedSignature = await computeCsrfSignature(randomValue);
                if (signature === expectedSignature) {
                    needsNewToken = false;
                }
            }
        }
        
        if (needsNewToken) {
            const randomValue = crypto.randomUUID();
            const signature = await computeCsrfSignature(randomValue);
            response.cookies.set('csrf_token', `${randomValue}.${signature}`, {
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false,
                maxAge: 60 * 60 * 24 // 1 day
            });
        }
    }

    // ─── 1. Auth gate ─────────────────────────────────────────────────────────
    // If the path requires login and there is no valid session cookie, redirect
    // to /login with the original path as returnUrl so the user can come back.
    const isProtected = PROTECTED_PREFIXES.some(prefix =>
        pathname === prefix || pathname.startsWith(prefix + '/')
    )

    if (isProtected) {
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('returnUrl', pathname + request.nextUrl.search)

            const redirectResponse = NextResponse.redirect(url)
            // Propagate any cookie mutations (e.g. cleared tokens) to the redirect response
            response.cookies.getAll().forEach(cookie => {
                redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
            })
            return redirectResponse
        }

        if (isSuspended) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('reason', 'suspended')

            const redirectResponse = NextResponse.redirect(url)
            response.cookies.getAll().forEach(cookie => {
                if (cookie.name.includes('-auth-token') || cookie.name.includes('sb-')) {
                    redirectResponse.cookies.delete(cookie.name)
                }
            })
            return redirectResponse
        }
    }

    // ─── 2. Role gate ─────────────────────────────────────────────────────────
    // When we have a known role from the JWT, prevent users from accessing the
    // wrong portal. Without user_metadata.role (older/legacy accounts), we skip
    // this gate — layout-level server checks handle those cases.
    if (user && userRole) {
        for (const [prefix, isAllowed] of Object.entries(PORTAL_ROLE_MAP)) {
            if (pathname === prefix || pathname.startsWith(prefix + '/')) {
                if (!isAllowed(userRole)) {
                    // Wrong portal — send them to their correct home
                    const url = request.nextUrl.clone()
                    url.pathname = portalForRole(userRole)
                    url.search = ''
                    return NextResponse.redirect(url)
                }
                break;
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes — auth handled inside the route handler)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         * - Common static asset extensions
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
