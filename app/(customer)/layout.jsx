import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function CustomerLayout({ children }) {
    const supabase = await createServerSupabaseClient();

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
            redirect('/admin');
        }
    }

    return children;
}
