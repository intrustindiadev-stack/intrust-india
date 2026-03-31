import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import MerchantLayout from '@/components/layout/merchant/MerchantLayout';
import MerchantBottomNav from '@/components/layout/merchant/MerchantBottomNav';

export default async function MerchantRootLayout({ children }) {
    const supabase = await createServerSupabaseClient();

    // 1. Check User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 1.5 Check if user has an approved merchant — gate on subscription being active AND not expired
    const { data: pendingPaymentMerchant } = await supabase
        .from('merchants')
        .select('status, subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

    if (pendingPaymentMerchant?.status === 'approved') {
        const isSubActive = pendingPaymentMerchant.subscription_status === 'active';
        const isExpired = pendingPaymentMerchant.subscription_expires_at
            && new Date(pendingPaymentMerchant.subscription_expires_at) < new Date();

        // Lazily mark as expired in DB so admin panel reflects reality
        if (isSubActive && isExpired) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );
            await supabaseAdmin
                .from('merchants')
                .update({ subscription_status: 'expired' })
                .eq('user_id', user.id);
        }

        if (!isSubActive || isExpired) {
            redirect('/merchant-subscribe');
        }
    }

    // 2. Check Role
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role;
    const allowedRoles = ['merchant'];

    if (!allowedRoles.includes(role)) {
        // Send admins to the admin panel, everyone else to home
        if (role === 'admin') {
            redirect('/admin');
        }
        redirect('/'); // Unauthorized
    }

    // 3. Check Merchant Status
    const { data: merchant } = await supabase
        .from('merchants')
        .select('status, subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

    if (!merchant) {
        redirect('/merchant-apply');
    }

    if (merchant.status === 'pending') {
        redirect('/merchant-status/pending');
    }
    if (merchant.status === 'rejected') {
        redirect('/merchant-status/rejected');
    }
    if (merchant.status === 'suspended') {
        redirect('/merchant-status/suspended');
    }
    const isSubExpired = merchant.subscription_expires_at
        && new Date(merchant.subscription_expires_at) < new Date();
    if (merchant.status === 'approved' && (merchant.subscription_status !== 'active' || isSubExpired)) {
        redirect('/merchant-subscribe');
    }
    if (merchant.status !== 'approved' && !['pending', 'rejected', 'suspended'].includes(merchant.status)) {
        redirect('/merchant-apply');
    }

    // 4. Render Layout (Authorized)
    return (
        <>
            <MerchantLayout>{children}</MerchantLayout>
            <MerchantBottomNav />
        </>
    );
}
