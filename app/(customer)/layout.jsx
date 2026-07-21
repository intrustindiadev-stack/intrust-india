'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function CustomerLayout({ children }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const refreshAttemptedRef = useRef(false);

    useEffect(() => {
        if (loading || !user || !profile) return;

        // Redirect non-customer roles to their respective portals
        const nonCustomerRoles = ['admin', 'super_admin', 'merchant', 'hr_manager', 'employee'];
        const isSalesRole = profile.role?.startsWith('sales_');
        
        if (nonCustomerRoles.includes(profile.role) || isSalesRole) {
            // Exceptions: merchant applying
            if (profile.role === 'merchant' && pathname?.startsWith('/merchant-apply')) {
                return;
            }

            // Determine target path
            let targetPath = '/admin';
            if (profile.role === 'merchant') targetPath = '/merchant/dashboard';
            else if (profile.role === 'hr_manager') targetPath = '/hrm';
            else if (profile.role === 'employee') targetPath = '/employee';
            else if (isSalesRole) targetPath = '/crm';

            // Refresh the session once to pick up the corrected user_metadata.role,
            // so middleware allows the portal route on the next navigation.
            // Without this, the stale JWT role causes an infinite redirect loop.
            if (!refreshAttemptedRef.current) {
                refreshAttemptedRef.current = true;
                supabase.auth.refreshSession().then(() => {
                    router.replace(targetPath);
                });
            } else {
                router.replace(targetPath);
            }
        }
    }, [user, profile, loading, router, pathname]);

    // While auth is resolving, render a blank screen instead of the customer UI.
    // This prevents admins/merchants from seeing a flash of the customer layout
    // before the redirect fires — eliminating the race condition that caused
    // the login-loop bug.
    if (loading) {
        return <div className="min-h-screen bg-[var(--bg-primary)]" />;
    }

    // If a non-customer role is loaded but redirect hasn't fired yet, suppress render
    const nonCustomerRolesList = ['admin', 'super_admin', 'merchant', 'hr_manager', 'employee', 'sales_exec', 'sales_manager', 'sales_agent'];
    if (profile && nonCustomerRolesList.includes(profile.role) && !pathname?.startsWith('/merchant-apply')) {
        return <div className="min-h-screen bg-[var(--bg-primary)]" />;
    }

    return children;
}
