import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import MarketingLayout from '@/components/marketing/layout/MarketingLayout';

export const metadata = {
    title: 'Marketing Workspace | InTrust India',
    description: 'Empowering local businesses and creators across India. Share, inspire, and grow together.',
};

export default async function MarketingRootLayout({ children }) {
    const supabase = await createServerSupabaseClient();

    // 1. Authenticate user
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        const headerList = await headers();
        const pathname = headerList.get('x-current-path') || '/marketing';
        redirect(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }

    // 2. Fetch User Profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role, full_name, email, phone, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

    const role = profile?.role || 'customer';
    const isMerchant = role === 'merchant';
    const isAdmin = role === 'admin' || role === 'super_admin';

    // Admins do not participate in the user-facing marketing workspace;
    // they have complete access and overview in the Admin Control Center.
    if (isAdmin) {
        redirect('/admin/marketing');
    }

    // 3. Fetch Merchant Context if user is merchant or admin
    let merchantData = null;
    if (isMerchant || isAdmin) {
        const query = supabase
            .from('merchants')
            .select('id, business_name, status, wallet_balance_paise, business_email, business_phone')
            .eq('user_id', user.id);

        const { data: merchant } = await query.maybeSingle();
        merchantData = merchant;

        if (!merchantData && isAdmin) {
            // Admin fallback
            merchantData = {
                id: 'admin-preview',
                business_name: 'InTrust HQ (Admin)',
                status: 'approved',
                wallet_balance_paise: 1000000
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

    return (
        <MarketingLayout 
            user={user} 
            profile={profile} 
            merchant={merchantData}
            customerWalletBalancePaise={customerWalletBalancePaise}
            isMerchant={isMerchant}
            isAdmin={isAdmin}
        >
            {children}
        </MarketingLayout>
    );
}
