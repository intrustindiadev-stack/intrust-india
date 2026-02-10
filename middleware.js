import { createServerClient as createClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
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

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes that require authentication
    const protectedRoutes = [
        '/dashboard',
        '/my-coupons',
        '/profile',
        '/gift-cards', // Require auth to browse coupons
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

        if (profile?.role === 'admin') {
            return NextResponse.redirect(new URL('/admin/merchants', request.url))
        } else if (profile?.role === 'merchant') {
            return NextResponse.redirect(new URL('/merchant/dashboard', request.url))
        } else {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
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
