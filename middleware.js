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
    const pathname = request.nextUrl.pathname;

    // ─── Maintenance Mode & Admin Bypass ─────────────────────────────────────────
    const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    const bypassKey = process.env.MAINTENANCE_BYPASS_KEY;
    const bypassCookie = request.cookies.get('intrust_maintenance_bypass')?.value;
    const bypassParam = request.nextUrl.searchParams.get('bypass');
    const isBypassParamValid = Boolean(bypassKey && bypassParam === bypassKey);
    const hasValidBypassCookie = bypassCookie === 'true';

    // 1. Admin Bypass via Query Parameter (?bypass=[MAINTENANCE_BYPASS_KEY])
    if (isBypassParamValid) {
        if (pathname.startsWith('/api/')) {
            const apiResponse = NextResponse.next();
            apiResponse.cookies.set('intrust_maintenance_bypass', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
            });
            return apiResponse;
        }

        // For page routes, redirect to clean URL without ?bypass= query param
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete('bypass');
        const redirectResponse = NextResponse.redirect(cleanUrl);
        redirectResponse.cookies.set('intrust_maintenance_bypass', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        return redirectResponse;
    }

    // 2. Maintenance Mode Interceptor
    if (isMaintenanceMode) {
        // Top check: If valid bypass cookie is present, completely skip maintenance
        if (hasValidBypassCookie) {
            if (pathname.startsWith('/api/')) {
                return NextResponse.next();
            }
            // Fall through to normal site logic below...
        } else {
            // Unbypassed traffic during active maintenance:

            // Allow /maintenance page to render directly without rewrite loop
            if (pathname === '/maintenance') {
                return NextResponse.next();
            }

            // Allow maintenance subscription and notification APIs to process requests
            if (pathname.startsWith('/api/maintenance/')) {
                return NextResponse.next();
            }

            // API routes: return hard 503 JSON to prevent frontend fetch crashes
            if (pathname.startsWith('/api/')) {
                return NextResponse.json(
                    { error: 'Service temporarily unavailable due to maintenance.' },
                    { status: 503, headers: { 'Retry-After': '3600' } }
                );
            }

            // Page routes: rewrite to /maintenance without changing the user's URL
            const maintenanceUrl = new URL('/maintenance', request.url);
            return NextResponse.rewrite(maintenanceUrl);
        }
    }

    // When maintenance is inactive (or bypassed), pass API routes through immediately
    if (pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    const requestHeaders = new Headers(request.headers);
    // Expose pathname to server components via custom header
    requestHeaders.set('x-current-path', pathname);

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

    const isWebhook = pathname.startsWith('/api/sabpaisa/') || pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/whatsapp/webhook');

    // ─── Skip auth logic for payment callbacks and webhooks ───────────────────
    // When a payment gateway POSTs to our callback URL, the browser does not
    // send SameSite=Lax cookies. If we call getSession() here with empty cookies,
    // the Supabase client writes empty cookies to the response, effectively logging
    // the user out. Bypassing middleware auth preserves the session.
    if (pathname.startsWith('/payment/') || isWebhook) {
        return response;
    }

    // ─── Session validation + token refresh ───────────────────────────────────
    // PRIMARY (protected routes): getUser() makes a live server-side check with
    // Supabase. This both validates the access token AND — critically — refreshes
    // it when expired: the SSR client rotates the sb-* cookies via setAll(),
    // which we persist onto the response below. Fix: previously getSession()
    // only decoded the (possibly stale) cookie and never refreshed, so users
    // with an expired access token were wrongly bounced to /login.
    //
    // FALLBACK (public routes / transient network failure): getSession() decodes
    // the cookie locally with zero network cost. On getUser() failure we fail
    // OPEN (pass through) so a transient Supabase timeout never causes a false
    // logout — the layout-level getUser() still re-verifies after render.
    //
    // Backend is loopback HTTP (see lib/supabaseServer.js), so the live call on
    // protected routes adds negligible latency vs. the correctness win.
    let user = null;
    let userRole = null;
    let isSuspended = false;
    let authRejected = false;

    try {
        const isProtectedPath = PROTECTED_PREFIXES.some(prefix =>
            pathname === prefix || pathname.startsWith(prefix + '/')
        );

        if (isProtectedPath) {
            // Server-validated + auto-refreshed (refreshed cookies flow into `response` via setAll)
            const { data, error } = await supabase.auth.getUser();
            if (!error && data?.user) {
                user = data.user;
            } else if (error) {
                // The server REJECTED the session (invalid/expired token, network
                // failure). Remember this — we must NOT resurrect a session from
                // the cookie below, otherwise a stale token gates access or a
                // transient failure false-logs the user out on refresh.
                console.warn('[MIDDLEWARE] getUser error:', error?.message)
                authRejected = true;
            }
        }

        // Fallback / public-route decode: cheap cookie read, no network call.
        // ONLY trusted when getUser() did NOT reject the session — i.e. for
        // public routes (no live check was made) or when the user simply has
        // no cookies at all. On rejection we fail OPEN (return below) and let
        // the layout-level getUser() make the authoritative decision.
        if (!user) {
            if (authRejected) {
                // Fail open: pass through; the layout will re-verify and, if the
                // session is genuinely invalid, redirect to /login itself.
                return response
            }
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
            if (!sessionError) {
                user = sessionData?.session?.user ?? null
            }
        }

        userRole = user?.user_metadata?.role ?? null
        isSuspended = user?.user_metadata?.is_suspended ?? false
    } catch (err) {
        // Cookie reading / decoding should never fail, but if it does — do NOT redirect.
        // Fail safe: let the request through; the layout will re-verify.
        console.warn('[MIDDLEWARE] session error, passing through:', err?.message)
        return response
    }

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
                    const redirectResponse = NextResponse.redirect(url)
                    // Propagate refreshed auth cookies to the redirect response too —
                    // otherwise a token refresh triggered by getUser() above is lost
                    // when the user is being routed to their correct portal.
                    response.cookies.getAll().forEach(cookie => {
                        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
                    })
                    return redirectResponse
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
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico
         * - images (static assets folder)
         * - Common static asset extensions
         */
        '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
    ],
}
