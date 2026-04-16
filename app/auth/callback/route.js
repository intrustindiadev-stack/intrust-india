import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

    if (!code) {
        return NextResponse.redirect(new URL('/', origin))
    }

    const cookieStore = await cookies()
    const cookiesToSet = []

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(newCookies) {
                    newCookies.forEach((c) => cookiesToSet.push(c))
                },
            },
        }
    )

    const applyCookies = (res) => {
        cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                ...options
            })
        })
        return res
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    const next = requestUrl.searchParams.get('next')

    if (error) {
        console.error('Exchange error:', error.message)

        // Handle identity linking errors
        if (error.code === 'identity_already_exists' || error.message?.includes('identity_already_exists') || error.message?.includes('already linked')) {
            return applyCookies(NextResponse.redirect(new URL('/profile?error=already_linked', origin)))
        }

        // Generic linking error if 'next' is present
        if (next && next.startsWith('/')) {
            const errorUrl = new URL(next, origin)
            errorUrl.searchParams.set('error', 'link_failed')
            return applyCookies(NextResponse.redirect(errorUrl))
        }

        return applyCookies(NextResponse.redirect(new URL('/', origin)))
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return applyCookies(NextResponse.redirect(new URL('/', origin)))
    }

    const type = requestUrl.searchParams.get('type')
    if (type === 'recovery') {
        return applyCookies(NextResponse.redirect(new URL('/reset-password?verified=true', origin)))
    }

    // Check for a custom redirect (e.g. from identity linking on profile page)
    if (next && next.startsWith('/')) {
        // If the next param points to reset-password, forward the user there
        if (next === '/reset-password') {
            return applyCookies(NextResponse.redirect(new URL('/reset-password', origin)))
        }
        const nextUrl = new URL(next, origin)
        // If coming from profile explicitly, append success flag
        if (next === '/profile' || next.startsWith('/profile?')) {
            nextUrl.searchParams.set('linked', 'google')
        }
        return applyCookies(NextResponse.redirect(nextUrl))
    }

    // Detect fresh email verification: only for native email/password signups.
    // Google OAuth also sets email_confirmed_at immediately, so we MUST check
    // the provider — otherwise Google users get wrongly redirected to /login?confirmed=true.
    const isEmailProvider = user.app_metadata?.provider === 'email'
    if (isEmailProvider && user.email && user.email_confirmed_at) {
        const confirmedAt = new Date(user.email_confirmed_at)
        const isJustVerified = (Date.now() - confirmedAt.getTime()) < 60_000
        if (isJustVerified) {
            // Sign the user out — they confirmed their email but should log in manually
            await supabase.auth.signOut()
            return applyCookies(NextResponse.redirect(new URL('/login?confirmed=true', origin)))
        }
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle() // safer than single()

    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        return applyCookies(NextResponse.redirect(new URL('/admin', origin)))
    }

    if (profile?.role === 'merchant') {
        return applyCookies(NextResponse.redirect(new URL('/merchant/dashboard', origin)))
    }

    return applyCookies(NextResponse.redirect(new URL('/dashboard', origin)))
}
