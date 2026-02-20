import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CustomerLayout({ children }) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // If logged in, check role
    if (user) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // If merchant tries to access customer routes, redirect them to their dashboard
        if (profile?.role === 'merchant') {
            redirect('/merchant/dashboard');
        }

        // Admins can also be redirected if we don't want them here, 
        // but typically admins need access everywhere or are redirected to /admin.
        if (profile?.role === 'admin') {
            redirect('/admin/dashboard');
        }
    }

    return children;
}
