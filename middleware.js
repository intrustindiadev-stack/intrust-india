import { createServerClient as createClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    const startTime = Date.now();
    const requestId = request.headers.get('x-request-id') || Math.random().toString(36).slice(2);

    // Quick cookie check before expensive getUser()
    const hasAuthCookie = request.cookies.getAll().some(
        cookie => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
    );

    // Skip auth check for public routes
    const publicPaths = ['/login', '/signup', '/about', '/contact', '/'];
    const isPublicPath = publicPaths.some(path =>
        request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith('/_next')
    );

    console.log('[MIDDLEWARE:START]', {
        requestId,
        path: request.nextUrl.pathname,
        hasAuthCookie,
        isPublicPath,
        userAgent: request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        timestamp: new Date().toISOString()
    });

    if (isPublicPath || !hasAuthCookie) {
        // Fast path: no auth needed or no auth cookie
        console.log('[MIDDLEWARE:FAST_PATH]', { requestId, reason: isPublicPath ? 'public' : 'no-auth' });
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    try {
        // Set a timeout for getUser to prevent mobile Safari hangs
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );

        const { data: { user } } = await Promise.race([
            getUserPromise,
            timeoutPromise
        ]);

        // Protected routes that require authentication
        const protectedRoutes = [
            '/dashboard',
            '/my-coupons',
            '/profile',
            // '/gift-cards' removed - browsing should be public, only purchase requires auth
        ]

        const adminRoutes = ['/admin']
        const merchantRoutes = ['/merchant']
        const { pathname } = request.nextUrl

        // Check if current path is protected
        const isProtectedRoute = protectedRoutes.some((route) =>
            pathname.startsWith(route)
        )
        const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))
        const isMerchantRoute = merchantRoutes.some((route) => pathname.startsWith(route))

        // Redirect to login if accessing protected route without session
        if ((isProtectedRoute || isAdminRoute || isMerchantRoute) && !user) {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('redirect', pathname)
            console.log('[MIDDLEWARE:REDIRECT]', { requestId, to: '/login', from: pathname });
            return NextResponse.redirect(redirectUrl)
        }

        // Role-based Access Control - MOVED TO LAYOUT for better performance
        // Middleware only enforces session presence for protected routes to avoid double DB calls.
        // Detailed role verification will happen in the Server Component Layouts.

        // Redirect to dashboard if accessing auth pages while logged in
        if ((pathname === '/login' || pathname === '/register') && user) {
            // Fetch role to redirect correctly
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            const elapsed = Date.now() - startTime;
            console.log('[MIDDLEWARE:END]', {
                requestId,
                userId: user?.id,
                elapsed,
                path: pathname
            });

            if (profile?.role === 'admin') {
                return NextResponse.redirect(new URL('/admin/merchants', request.url))
            } else if (profile?.role === 'merchant') {
                return NextResponse.redirect(new URL('/merchant/dashboard', request.url))
            } else {
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        }

        const elapsed = Date.now() - startTime;
        console.log('[MIDDLEWARE:END]', {
            requestId,
            userId: user?.id,
            elapsed,
            path: pathname
        });

        // Alert if slow
        if (elapsed > 2000) {
            console.warn('[MIDDLEWARE:SLOW]', {
                requestId,
                elapsed,
                path: pathname
            });
        }

        return response

    } catch (error) {
        console.error('[MIDDLEWARE:ERROR]', {
            requestId,
            error: error.message,
            path: request.nextUrl.pathname
        });
        // On error, allow request to continue (fail open)
        return response;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
