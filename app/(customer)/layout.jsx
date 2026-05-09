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
        redirect('/login');
    }

    // Removed global redirect to allow public access to /services and /shop
    // Authentication is now enforced at the (protected) layout level or page level

    // If logged in, check role
    if (user) {
        let profile = null;
        try {
            const getProfilePromise = supabase
                .from('user_profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile timeout')), 3000)
            );
            const { data, error } = await Promise.race([getProfilePromise, timeoutPromise]);
            if (error) {
                console.error('Profile fetch error:', error);
                throw new Error('Failed to fetch profile');
            }
            profile = data;
        } catch (error) {
            redirect('/login');
        }

        // If admin tries to access customer routes, redirect to admin panel
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            redirect('/admin');
        }
        // If merchant tries to access customer routes, redirect them to their dashboard
        if (profile?.role === 'merchant') {
            redirect('/merchant/dashboard');
        }
    }

    return children;
}
