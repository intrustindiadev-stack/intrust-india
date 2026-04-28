import UnauthorizedRedirect from '@/components/auth/UnauthorizedRedirect';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import EmployeeLayout from '@/components/layout/employee/EmployeeLayout';

export default async function EmployeeRootLayout({ children }) {
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

    // Any valid internal role can access the employee portal
    const validRoles = ['employee', 'sales_exec', 'sales_manager', 'hr_manager', 'admin', 'super_admin'];
    if (!validRoles.includes(profile?.role)) {
        return <UnauthorizedRedirect to="/" message="Employee Access Required. Redirecting..." />;
    }

    return (
        <EmployeeLayout userProfile={profile}>
            {children}
        </EmployeeLayout>
    );
}
