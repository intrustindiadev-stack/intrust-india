import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';


export default async function CustomerLayout({ children }) {
    const supabase = await createServerSupabaseClient();

    let user = null;
    try {
        const getUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), 1500)
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
                setTimeout(() => reject(new Error('Profile timeout')), 2000)
            );
            const { data, error } = await Promise.race([getProfilePromise, timeoutPromise]);
            if (!error && data) {
                profile = data;
            } else {
                console.warn('Profile fetch soft-failed, proceeding without profile:', error?.message);
            }
        } catch (error) {
            console.warn('Profile fetch soft-failed, proceeding without profile:', error.message);
        }

        // If admin tries to access customer routes, redirect to admin panel
        if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            redirect('/admin');
        }
        // If merchant tries to access customer routes, redirect them to their dashboard
        // But only if they actually have a merchant record in the DB to avoid redirect loops on /merchant-apply.
        if (profile?.role === 'merchant') {
            const { data: merchant } = await supabase
                .from('merchants')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (merchant) {
                redirect('/merchant/dashboard');
            }
        }
    }

    return children;
}
