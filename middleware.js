import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return request.cookies.get(name)?.value
                },
                set(name, value, options) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name, options) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Refresh session if expired
    const {
        data: { session },
    } = await supabase.auth.getSession()

    const { pathname } = request.nextUrl

    // Protected routes that require authentication
    const protectedRoutes = [
        '/dashboard',
        '/my-coupons',
        '/profile',
        '/gift-cards', // Require auth to browse coupons
    ]

    // Admin-only routes
    const adminRoutes = ['/admin']

    // Check if current path is protected
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    )
    const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

    // Redirect to login if accessing protected route without session
    if (isProtectedRoute && !session) {
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
    }

    // Check admin access - TEMPORARILY DISABLED FOR TESTING
    // TODO: Re-enable this after fixing RLS policies
    /*
    if (isAdminRoute && session) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()

        if (profile?.role !== 'admin') {
            // Not an admin, redirect to dashboard
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }
    */

    // Redirect to dashboard if accessing auth pages while logged in
    if ((pathname === '/login' || pathname === '/register') && session) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
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
