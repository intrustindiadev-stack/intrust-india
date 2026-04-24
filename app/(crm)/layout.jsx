import UnauthorizedRedirect from '@/components/auth/UnauthorizedRedirect';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import CRMLayout from '@/components/layout/crm/CRMLayout';

export default async function CRMRootLayout({ children }) {
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

    if (!['sales_exec', 'sales_manager', 'admin', 'super_admin'].includes(profile?.role)) {
        return <UnauthorizedRedirect to="/" message="CRM Access Required. Redirecting..." />;
    }

    return (
        <CRMLayout userProfile={profile}>
            {children}
        </CRMLayout>
    );
}
