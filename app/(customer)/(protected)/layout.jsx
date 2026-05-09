import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';

export default async function ProtectedCustomerLayout({ children }) {
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

    if (!user) {
        redirect('/login');
    }

    // Role-based redirection is already handled in the parent (customer) layout
    // This layout specifically enforces session presence for protected routes

    return children;
}
