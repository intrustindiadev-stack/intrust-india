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

    return children;
}

