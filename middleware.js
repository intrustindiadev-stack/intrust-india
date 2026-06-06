import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
    const requestHeaders = new Headers(request.headers);
    // Set current path header so downstream components can read it
    requestHeaders.set('x-current-path', request.nextUrl.pathname);

    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
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
                    response = NextResponse.next({
                        request: {
                            headers: requestHeaders,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Check session validity using getUser()
    const { data: { user } } = await supabase.auth.getUser()

    // Protected routes requiring authentication redirect
    const protectedPrefixes = [
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

    const pathname = request.nextUrl.pathname
    const isProtected = protectedPrefixes.some(prefix => 
        pathname === prefix || pathname.startsWith(prefix + '/')
    )

    if (isProtected && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('returnUrl', pathname + request.nextUrl.search)
        
        const redirectResponse = NextResponse.redirect(url)
        // Copy cookies (e.g., deleted tokens) from response to redirectResponse
        response.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes - we do not want redirect behavior on API endpoints)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images/assets ending in common extensions
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
