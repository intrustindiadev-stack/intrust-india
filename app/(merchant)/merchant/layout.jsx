import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import MerchantLayout from '@/components/layout/merchant/MerchantLayout';
import MerchantBottomNav from '@/components/layout/merchant/MerchantBottomNav';
import MerchantGlobalChat from '@/components/chat/merchant/MerchantGlobalChat';


import { SubscriptionProvider } from '@/components/merchant/SubscriptionContext';
import { getPricingSettings } from '@/app/(admin)/admin/settings/actions';
import { buildMerchantSubscriptionPlans } from '@/lib/merchant/subscriptionPricing';
import { getPayerContact } from '@/lib/merchant/getPayerContact';

export default async function MerchantRootLayout({ children }) {
    const supabase = await createServerSupabaseClient();
    const pricing = await getPricingSettings();

    const dynamicPlans = buildMerchantSubscriptionPlans(pricing);

    // 1. Check User
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        const headerList = await headers();
        const pathname = headerList.get('x-current-path') || '';
        const redirectUrl = pathname ? `/login?returnUrl=${encodeURIComponent(pathname)}` : '/login';
        redirect(redirectUrl);
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
            .select('id, business_name, status, subscription_status, subscription_expires_at, business_email, business_phone')
            .limit(1)
            .maybeSingle();

        const adminMerchantObj = adminMerchant || { id: 'admin-bypass', business_name: 'Admin View', status: 'approved' };
        const { payerEmail, payerPhone } = getPayerContact({ merchant: adminMerchantObj, profile, authUser: user });
        console.log('Resolved Payer Email (Admin Bypass):', payerEmail);

        const merchantWithProfile = { ...adminMerchantObj, user_profiles: profile, payerEmail, payerPhone };

        return (
            <SubscriptionProvider isSubscribed={true} merchantData={merchantWithProfile} plans={dynamicPlans}>
                <>
                    <MerchantLayout>
                        {children}
                    </MerchantLayout>
                    <MerchantGlobalChat />
                    <MerchantBottomNav />
                </>
            </SubscriptionProvider>
        );
    }

    // Fetch full merchant data so we can pass it to the subscription provider
    const { data: merchant } = await supabase
        .from('merchants')
        .select('id, business_name, status, subscription_status, subscription_expires_at, business_email, business_phone, show_lockin, show_ai_grow, show_ai_orders')
        .eq('user_id', user.id)
        .maybeSingle();

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

    // ── 3.5 Super-admin feature-visibility gate ────────────────────────────────
    // Columns show_lockin / show_ai_grow / show_ai_orders are managed per merchant
    // by a super admin (PATCH /api/admin/merchants/[id]/visibility). They default to false (hidden).
    // When a flag is not explicitly true, any direct URL access to the corresponding page is
    // bounced back to the merchant dashboard — this is the real access boundary; the sidebar
    // filtering in components/merchant/Sidebar.jsx is cosmetic on top.
    // `show_ai_orders` also controls the dependent My Vault pages.
    const featureRouteGuards = [
        { enabled: Boolean(merchant.show_lockin), prefixes: ['/merchant/lockin'] },
        { enabled: Boolean(merchant.show_ai_grow), prefixes: ['/merchant/investments'] },
        { enabled: Boolean(merchant.show_ai_orders), prefixes: ['/merchant/ai-orders', '/merchant/vault'] },
    ];
    const blockedFeature = featureRouteGuards.find(
        (g) => !g.enabled && g.prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
    );
    if (blockedFeature) {
        redirect('/merchant/dashboard');
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
    const { payerEmail, payerPhone } = getPayerContact({ merchant, profile, authUser: user });
    console.log('Resolved Payer Email (Merchant):', payerEmail);
    const merchantWithProfile = { ...merchant, user_profiles: profile, payerEmail, payerPhone };

    // 5. Render Layout (Authorized to View, Interactions handled by SubscriptionProvider)
    return (
        <SubscriptionProvider isSubscribed={isSubscribed} merchantData={merchantWithProfile} plans={dynamicPlans}>
            <>
                <MerchantLayout>
                    {children}
                </MerchantLayout>
                <MerchantGlobalChat />
                <MerchantBottomNav />
            </>
        </SubscriptionProvider>
    );
}
