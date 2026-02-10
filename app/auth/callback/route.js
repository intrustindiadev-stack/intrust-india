import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');

    if (code) {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: {
                    get(name) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name, value, options) {
                        cookieStore.set({ name, value, ...options });
                    },
                    remove(name, options) {
                        cookieStore.set({ name, value: '', ...options });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'admin') {
                    return NextResponse.redirect(new URL('/admin/merchants', requestUrl.origin));
                } else if (profile?.role === 'merchant') {
                    return NextResponse.redirect(new URL('/merchant/dashboard', requestUrl.origin));
                }
            }
        }
    }

    // Default redirect for non-admin/non-merchant or if no code
    return NextResponse.redirect(new URL('/', requestUrl.origin));
}
