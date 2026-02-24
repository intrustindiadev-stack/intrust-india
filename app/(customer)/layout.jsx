import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function CustomerLayout({ children }) {
    const supabase = await createServerSupabaseClient();

    let user = null;
    try {
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 3000)
        );
        const { data } = await Promise.race([getUserPromise, timeoutPromise]);
        user = data?.user;
    } catch (error) {
        console.error('Customer layout auth timeout:', error.message);
    }
    // If logged in, check role
    if (user) {
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // If admin tries to access customer routes, redirect to admin panel
        if (profile?.role === 'admin') {
            redirect('/admin');
        }
        // If merchant tries to access customer routes, redirect them to their dashboard
        if (profile?.role === 'merchant') {
            redirect('/merchant/dashboard');
        }
    }

    return children;
}
