import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const origin = requestUrl.origin;

    if (code) {
        const cookieStore = cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name, value, options) {
                        try {
                            cookieStore.set({ name, value, ...options });
                        } catch (error) {
                            // Cookies can only be set in ServerComponents/RouteHandlers
                            // This error is expected during build time
                        }
                    },
                    remove(name, options) {
                        try {
                            cookieStore.set({ name, value: '', ...options });
                        } catch (error) {
                            // Cookies can only be removed in ServerComponents/RouteHandlers
                        }
                    },
                },
            }
        );

        // Exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Get user and their profile to determine redirect
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                // Role-based redirect
                if (profile?.role === 'admin') {
                    return NextResponse.redirect(new URL('/admin', origin));
                } else if (profile?.role === 'merchant') {
                    return NextResponse.redirect(new URL('/merchant/dashboard', origin));
                }
            }

            // Default redirect for authenticated users
            return NextResponse.redirect(new URL('/dashboard', origin));
        } else {
            console.error('Auth callback error:', error.message);
        }
    }

    // Redirect to home if no code or error occurred
    return NextResponse.redirect(new URL('/', origin));
}
