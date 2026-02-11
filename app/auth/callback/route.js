import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    if (!code) {
        return NextResponse.redirect(new URL('/', origin))
    }

    const cookieStore = await cookies() // ✅ MUST be awaited

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get: (name) => cookieStore.get(name)?.value,
                set: (name, value, options) => {
                    cookieStore.set({ name, value, ...options })
                },
                remove: (name, options) => {
                    cookieStore.set({ name, value: '', ...options })
                },
            },
        }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error('Exchange error:', error.message)
        return NextResponse.redirect(new URL('/', origin))
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.redirect(new URL('/', origin))
    }

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle() // safer than single()

    if (profile?.role === 'admin') {
        return NextResponse.redirect(new URL('/admin', origin))
    }

    if (profile?.role === 'merchant') {
        return NextResponse.redirect(new URL('/merchant/dashboard', origin))
    }

    return NextResponse.redirect(new URL('/dashboard', origin))
}
