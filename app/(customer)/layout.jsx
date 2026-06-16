'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function CustomerLayout({ children }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading || !user || !profile) return;

        // If admin tries to access customer routes, redirect to admin panel
        if (profile.role === 'admin' || profile.role === 'super_admin') {
            router.replace('/admin');
        }

        // If merchant tries to access customer routes, redirect them to their dashboard
        // Avoid redirect loops on merchant application pages
        if (profile.role === 'merchant') {
            if (pathname && !pathname.startsWith('/merchant-apply')) {
                router.replace('/merchant/dashboard');
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
    if (profile && ['admin', 'super_admin', 'merchant'].includes(profile.role) && !pathname?.startsWith('/merchant-apply')) {
        return <div className="min-h-screen bg-[var(--bg-primary)]" />;
    }

    return children;
}


