import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';
import CustomerAppShell from '@/components/layout/customer/CustomerAppShell';
import { IS_MARKETING_COMING_SOON } from '@/lib/marketingConfig';

export const metadata = {
    title: 'Marketing Hub — Coming Soon | InTrust India',
    description: 'Empowering local businesses and creators across India. Daily cash challenges, deal sharing, and rewards launching soon.',
};

export default async function MarketingRootLayout({ children }) {
    const supabase = await createServerSupabaseClient();
    const headerList = await headers();
    const pathname = headerList.get('x-current-path') || '/marketing';

    // 1. Authenticate user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 2. Fetch User Profile
    let profile = null;
    if (user) {
        const { data: p } = await supabase
            .from('user_profiles')
            .select('id, role, full_name, email, phone, avatar_url, kyc_status')
            .eq('id', user.id)
            .maybeSingle();
        profile = p;
    }

    const role = profile?.role || 'customer';
    const isMerchant = role === 'merchant';
    const isAdmin = role === 'admin' || role === 'super_admin';

    // Admins do not participate in the user-facing marketing workspace;
    // they have complete access and overview in the Admin Control Center.
    if (isAdmin) {
        redirect('/admin/marketing');
    }

    // ── Coming Soon Handler ──────────────────────────────────────────
    if (IS_MARKETING_COMING_SOON) {
        // Any subroute under /marketing/* (like /marketing/daily-challenge) is redirected to /marketing
        if (pathname !== '/marketing') {
            redirect('/marketing');
        }

        return (
            <CustomerAppShell fullWidth={true}>
                {children}
            </CustomerAppShell>
        );
    }

    if (!user) {
        redirect(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }

    // 3. Fetch Merchant Context if user is merchant or admin
    let merchantData = null;
    if (isMerchant || isAdmin) {
        const query = supabase
            .from('merchants')
            .select('id, business_name, status, wallet_balance_paise, business_email, business_phone, subscription_status, subscription_expires_at')
            .eq('user_id', user.id);

        const { data: merchant } = await query.maybeSingle();
        merchantData = merchant;

        if (!merchantData && isAdmin) {
            // Admin fallback
            merchantData = {
                id: 'admin-preview',
                business_name: 'InTrust HQ (Admin)',
                status: 'approved',
                wallet_balance_paise: 1000000,
                subscription_status: 'active'
            };
        }
    }

    // 4. Fetch Customer Wallet balance if customer
    let customerWalletBalancePaise = 0;
    if (!isMerchant) {
        const { data: wallet } = await supabase
            .from('customer_wallets')
            .select('balance_paise')
            .eq('user_id', user.id)
            .maybeSingle();
        customerWalletBalancePaise = wallet?.balance_paise || 0;
    }

    // 5. Enforce Access Gates
    // - Regular Customers: Locked until KYC identity verification is approved
    // - Merchants: Locked until merchant application is approved and subscription is active
    let accessGate = null;
    if (isMerchant) {
        const isSubActive = merchantData?.status === 'approved' && 
            merchantData?.subscription_status === 'active' && 
            (!merchantData?.subscription_expires_at || new Date(merchantData.subscription_expires_at) > new Date());

        if (!isSubActive) {
            const subStatus = merchantData?.status !== 'approved' 
                ? 'pending' 
                : (merchantData?.subscription_status || 'inactive');
            accessGate = { type: 'subscription', status: subStatus };
        }
    } else if (!isAdmin) {
        if (profile?.kyc_status !== 'verified') {
            accessGate = { type: 'kyc', status: profile?.kyc_status || 'not_started' };
        }
    }

    return (
        <MarketingLayout 
            user={user} 
            profile={profile} 
            merchant={merchantData}
            customerWalletBalancePaise={customerWalletBalancePaise}
            isMerchant={isMerchant}
            isAdmin={isAdmin}
            accessGate={accessGate}
        >
            {children}
        </MarketingLayout>
    );
}
