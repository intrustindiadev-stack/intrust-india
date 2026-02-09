'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import MerchantLayout from '@/components/layout/merchant/MerchantLayout';
import MerchantBottomNav from '@/components/layout/merchant/MerchantBottomNav';
import { Loader2 } from 'lucide-react';

export default function MerchantRootLayout({ children }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
        try {
            // Check authentication
            const { data: { user } } = await supabase.auth.getUser();
            console.log('🔍 User check:', user ? `Logged in as ${user.id}` : 'Not logged in');

            if (!user) {
                console.log('❌ No user, redirecting to login');
                router.push('/login');
                return;
            }

            // TEMPORARY BYPASS: Skip merchant status check
            console.log('⚠️ BYPASSING MERCHANT CHECK for development');
            setAuthorized(true);
            return;

            /* 
            // Check if user has merchant profile
            const { data: merchant, error } = await supabase
                .from('merchants')
                .select('status')
                .eq('user_id', user.id)
                .single();

            console.log('🔍 Merchant query result:', { merchant, error });

            // If no merchant profile, redirect to apply page
            if (error || !merchant) {
                console.log('❌ No merchant profile found, redirecting to apply');
                console.log('Error details:', error);
                router.push('/merchant-apply');
                return;
            }

            console.log('✅ Merchant found with status:', merchant.status);

            // Redirect based on merchant status
            if (merchant.status === 'pending') {
                console.log('⏳ Status is pending, redirecting');
                router.push('/merchant/pending');
                return;
            }

            if (merchant.status === 'rejected') {
                console.log('❌ Status is rejected, redirecting');
                router.push('/merchant/rejected');
                return;
            }

            if (merchant.status === 'suspended') {
                console.log('🚫 Status is suspended, redirecting');
                router.push('/merchant/suspended');
                return;
            }

            // Only approved merchants can access the merchant panel
            if (merchant.status !== 'approved') {
                console.log('❌ Status is not approved:', merchant.status);
                router.push('/merchant-apply');
                return;
            }

            console.log('✅ All checks passed! Granting access');
            // All checks passed
            setAuthorized(true);
            */
        } catch (error) {
            console.error('❌ Access check error:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-[#92BCEA] mx-auto mb-4" />
                    <p className="text-gray-600">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!authorized) {
        return null; // Will redirect
    }

    return (
        <>
            <MerchantLayout>{children}</MerchantLayout>
            <MerchantBottomNav />
        </>
    );
}
