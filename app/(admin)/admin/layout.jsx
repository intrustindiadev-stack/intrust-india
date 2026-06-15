import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import AdminLayout from '@/components/layout/admin/AdminLayout';
import AdminBottomNav from '@/components/layout/admin/AdminBottomNav';

import UnauthorizedRedirect from '@/components/auth/UnauthorizedRedirect';

// Maps a role to its home portal
function portalForRole(role) {
    if (!role) return '/login';
    if (role === 'merchant') return '/merchant/dashboard';
    if (role === 'hr_manager') return '/hrm';
    if (role === 'employee') return '/employee';
    if (role?.startsWith('sales_') || role === 'sales_exec' || role === 'sales_agent') return '/crm';
    return '/dashboard'; // customer or unknown
}

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
        // Route them to their actual portal, not just "/" (which would cause a loop)
        const destination = portalForRole(profile?.role);
        return <UnauthorizedRedirect to={destination} message="Admin Access Required. Redirecting..." />;
    }

    return (
        <AdminLayout adminProfile={profile}>
            {children}
        </AdminLayout>
    );
}
