import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getMerchantReferralData } from './actions';
import ReferralNetworkClient from '@/components/merchant/referrals/ReferralNetworkClient';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Refer & Earn | Merchant Panel',
    description: 'Grow your partner network and earn instant cash rewards for every merchant you refer.'
};

export default async function MerchantReferralsPage() {
    const supabase = await createServerSupabaseClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        redirect('/login');
    }

    // Get merchant ID
    const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (merchantError || !merchant) {
        redirect('/merchant-apply');
    }

    const {
        referralCode,
        hasReferrer,
        directReferrals = [],
        prizeHistory = [],
        chainDepth = 0,
        referralPrizeRupees = 500
    } = await getMerchantReferralData(merchant.id);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <ReferralNetworkClient
                referralCode={referralCode}
                hasReferrer={hasReferrer}
                directReferrals={directReferrals}
                prizeHistory={prizeHistory}
                chainDepth={chainDepth}
                referralPrizeRupees={referralPrizeRupees}
            />
        </div>
    );
}

