import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Maps a role to its home portal path
function portalForRole(role) {
    if (!role) return '/dashboard';
    if (role === 'admin' || role === 'super_admin') return '/admin';
    if (role === 'merchant') return '/merchant/dashboard';
    if (role === 'hr_manager') return '/hrm';
    if (role === 'employee') return '/employee';
    if (role?.startsWith('sales_') || role === 'sales_exec' || role === 'sales_agent') return '/crm';
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
// Only these portals enforce strict role checking at middleware level.
// /dashboard is intentionally excluded — customer layout handles admin redirects client-side.
const PORTAL_ROLE_MAP = {
    '/admin':    (r) => r === 'admin' || r === 'super_admin',
    '/merchant': (r) => r === 'merchant',
    '/hrm':      (r) => r === 'hr_manager',
    '/crm':      (r) => r?.startsWith('sales_') || r === 'sales_exec' || r === 'sales_agent',
    '/employee': (r) => r === 'employee',
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
    try {
        const { data } = await supabase.auth.getSession()
        session = data?.session ?? null
        // Role is written to user_metadata during sign-up and embedded in the JWT.
        // Reading it here costs zero extra DB round-trips.
        userRole = session?.user?.user_metadata?.role ?? null
    } catch (err) {
        // Cookie reading should never fail, but if it does — do NOT redirect.
        // Fail safe: let the request through; the layout will re-verify.
        console.warn('[MIDDLEWARE] getSession error, passing through:', err?.message)
        return response
    }

    const user = session?.user ?? null

    // ─── 1. Auth gate ─────────────────────────────────────────────────────────
    // If the path requires login and there is no valid session cookie, redirect
    // to /login with the original path as returnUrl so the user can come back.
    const isProtected = PROTECTED_PREFIXES.some(prefix =>
        pathname === prefix || pathname.startsWith(prefix + '/')
    )

    if (isProtected && !user) {
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
