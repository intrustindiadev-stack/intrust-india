import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import MerchantLayout from '@/components/layout/merchant/MerchantLayout';
import MerchantBottomNav from '@/components/layout/merchant/MerchantBottomNav';

import { SubscriptionProvider } from '@/components/merchant/SubscriptionContext';

export default async function MerchantRootLayout({ children }) {
    const supabase = await createServerSupabaseClient();

    // 1. Check User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // 2. Check Role
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name, email, phone')
        .eq('id', user.id)
        .single();

    const role = profile?.role;
    const isAdmin = role === 'admin' || role === 'super_admin';
    const allowedRoles = ['merchant', 'admin', 'super_admin'];

    if (!allowedRoles.includes(role)) {
        redirect('/'); // Unauthorized
    }

    // 3. Check Merchant Status & Subscription
    // Admins get full bypass — they can manage any merchant store
    if (isAdmin) {
        // Fetch the first merchant (or none) for context — don't block
        const { data: adminMerchant } = await supabase
            .from('merchants')
            .select('id, business_name, status, subscription_status, subscription_expires_at')
            .limit(1)
            .maybeSingle();

        const merchantWithProfile = adminMerchant
            ? { ...adminMerchant, user_profiles: profile }
            : { id: 'admin-bypass', business_name: 'Admin View', status: 'approved', user_profiles: profile };

        return (
            <SubscriptionProvider isSubscribed={true} merchantData={merchantWithProfile}>
                <>
                    <MerchantLayout>
                        {children}
                    </MerchantLayout>
                    <MerchantBottomNav />
                </>
            </SubscriptionProvider>
        );
    }

    // Fetch full merchant data so we can pass it to the subscription provider
    const { data: merchant } = await supabase
        .from('merchants')
        .select('id, business_name, status, subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

    if (!merchant) {
        redirect('/merchant-apply');
    }

    const headerList = await headers();
    const pathname = headerList.get('x-current-path') || '';

    if (merchant.status === 'pending') {
        redirect('/merchant-status/pending');
    }
    if (merchant.status === 'rejected') {
        redirect('/merchant-status/rejected');
    }
    if (merchant.status === 'suspended' && pathname !== '/merchant-status/suspended') {
        redirect('/merchant-status/suspended');
    }
    if (merchant.status !== 'approved' && !['pending', 'rejected', 'suspended'].includes(merchant.status)) {
        redirect('/merchant-apply');
    }

    // 4. Validate Subscription Active/Expired
    const isSubActive = merchant.subscription_status === 'active';
    const isExpired = merchant.subscription_expires_at
        && new Date(merchant.subscription_expires_at) < new Date();

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

    const isSubscribed = isSubActive && !isExpired;

    // Attach profile to merchant object so payment modal can prefill
    const merchantWithProfile = { ...merchant, user_profiles: profile };

    // 5. Render Layout (Authorized to View, Interactions handled by SubscriptionProvider)
    return (
        <SubscriptionProvider isSubscribed={isSubscribed} merchantData={merchantWithProfile}>
            <>
                <MerchantLayout>
                    {children}
                </MerchantLayout>
                <MerchantBottomNav />
            </>
        </SubscriptionProvider>
    );
}
