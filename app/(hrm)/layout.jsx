import UnauthorizedRedirect from '@/components/auth/UnauthorizedRedirect';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import HRMLayout from '@/components/layout/hrm/HRMLayout';

export default async function HRMRootLayout({ children }) {
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

    const validRoles = ['hr_manager', 'admin', 'super_admin'];

    if (!validRoles.includes(profile?.role)) {
        return <UnauthorizedRedirect to="/" message="HR Admin Access Required. Redirecting..." />;
    }

    return (
        <HRMLayout userProfile={profile}>
            {children}
        </HRMLayout>
    );
}
