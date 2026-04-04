import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import AdminLayout from '@/components/layout/admin/AdminLayout';
import AdminBottomNav from '@/components/layout/admin/AdminBottomNav';

export default async function AdminRootLayout({ children }) {
    // Use session-aware client to identify the user (reads cookies)
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Use admin client to bypass RLS for profile fetch
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
        .from('user_profiles')
        .select('role, full_name, email, avatar_url')
        .eq('id', user.id)
        .single();

    if (!['admin', 'super_admin'].includes(profile?.role)) {
        redirect('/');
    }

    return (
        <AdminLayout adminProfile={profile}>{children}</AdminLayout>
    );
}
