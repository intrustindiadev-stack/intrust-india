import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import AdminLayout from '@/components/layout/admin/AdminLayout';
import AdminBottomNav from '@/components/layout/admin/AdminBottomNav';
import PageTransition from '@/components/layout/PageTransition';
import UnauthorizedRedirect from '@/components/auth/UnauthorizedRedirect';

export default async function AdminRootLayout({ children }) {
    // Use session-aware client to identify the user (reads cookies)
    const authSupabase = await createServerSupabaseClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
        return <UnauthorizedRedirect to="/login" message="Authentication Required. Redirecting..." />;
    }

    // Use admin client to bypass RLS for profile fetch
    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
        .from('user_profiles')
        .select('role, full_name, email, avatar_url')
        .eq('id', user.id)
        .single();

    if (!['admin', 'super_admin'].includes(profile?.role)) {
        return <UnauthorizedRedirect to="/" message="Admin Access Required. Redirecting..." />;
    }

    return (
        <AdminLayout adminProfile={profile}>
            <PageTransition>{children}</PageTransition>
        </AdminLayout>
    );
}
