'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import CustomerBottomNav from '@/components/layout/customer/CustomerBottomNav';

// Lightweight branded loading skeleton — avoids importing heavy components
// that would inflate the customer layout bundle for every page.
export function CustomerLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#92BCEA]/20 to-[#AFB3F7]/20 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-[#92BCEA]/30 border-t-[#92BCEA] rounded-full animate-spin" />
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-medium animate-pulse">
                    Loading...
                </p>
            </div>
        </div>
    );
}

// Non-customer roles that should be redirected away from the customer portal
const NON_CUSTOMER_ROLES = [
    'admin', 'super_admin', 'merchant', 'hr_manager',
    'employee', 'freelancer', 'video_editor', 'social_media_manager',
    'seo_specialist', 'advertiser', 'support_agent',
    'relationship_exec', 'relationship_manager',
];

export default function CustomerLayout({ children }) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const refreshAttemptedRef = useRef(false);

    // Derive the effective role from both JWT metadata (instant) and DB profile (async).
    // JWT role is available immediately from the decoded session token, while
    // profile.role requires a network fetch. Using both provides belt-and-suspenders
    // protection against the role flash.
    const jwtRole = user?.user_metadata?.role;
    const effectiveRole = profile?.role || jwtRole;
    const isCRMRole = effectiveRole === 'relationship_exec' || effectiveRole === 'relationship_manager';
    const isNonCustomer = effectiveRole && (NON_CUSTOMER_ROLES.includes(effectiveRole) || isCRMRole);

    useEffect(() => {
        if (loading || !user) return;
        // Wait for either profile or JWT role to be available
        if (!effectiveRole) return;

        if (isNonCustomer) {
            // Exceptions: merchant applying
            if (effectiveRole === 'merchant' && pathname?.startsWith('/merchant-apply')) {
                return;
            }

            // Determine target path
            let targetPath = '/admin';
            if (effectiveRole === 'merchant') targetPath = '/merchant/dashboard';
            else if (effectiveRole === 'hr_manager') targetPath = '/hrm';
            else if (['employee', 'freelancer', 'video_editor', 'social_media_manager', 'seo_specialist', 'advertiser', 'support_agent'].includes(effectiveRole)) targetPath = '/employee';
            else if (isCRMRole) targetPath = '/crm';

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
    }, [user, effectiveRole, isNonCustomer, loading, router, pathname, isCRMRole]);

    // While auth is resolving, show a branded loading skeleton instead of a
    // blank white screen. This eliminates the "white screen" on mobile where
    // slower networks cause a multi-second blank page.
    if (loading) {
        return <CustomerLoadingSkeleton />;
    }

    // If a non-customer role is detected (from JWT or profile), suppress rendering
    // children while the redirect fires. This check uses the JWT role too, so it
    // triggers instantly — no waiting for the async profile fetch.
    if (isNonCustomer && !pathname?.startsWith('/merchant-apply')) {
        return <CustomerLoadingSkeleton />;
    }

    return (
        <>
            {children}
            <CustomerBottomNav />
        </>
    );
}
