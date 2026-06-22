import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import MerchantSubscriptionPayButton from '@/components/merchant/MerchantSubscriptionPayButton';
import { getPricingSettings } from '@/app/(admin)/admin/settings/actions';
import { getPayerContact } from '@/lib/merchant/getPayerContact';
import { buildMerchantSubscriptionPlans } from '@/lib/merchant/subscriptionPricing';

export const dynamic = 'force-dynamic';

export default async function MerchantSubscribePage() {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: merchant } = await supabase
        .from('merchants')
        .select('id, status, subscription_status, subscription_expires_at, business_name, business_email, business_phone')
        .eq('user_id', user.id)
        .single();

    if (!merchant) redirect('/merchant-apply');
    if (merchant.status === 'pending') redirect('/merchant-status/pending');
    if (merchant.status === 'rejected') redirect('/merchant-status/rejected');
    if (merchant.status === 'suspended') redirect('/merchant-status/suspended');
    if (merchant.status !== 'approved') redirect('/merchant-apply');

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single();

    const { payerEmail, payerPhone } = getPayerContact({ merchant, profile, authUser: user });

    if (!payerEmail) {
        redirect('/merchant/profile?missingContact=1');
    }

    const pricing = await getPricingSettings();

    const dynamicPlans = buildMerchantSubscriptionPlans(pricing);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <MerchantSubscriptionPayButton
                merchantId={merchant.id}
                businessName={merchant.business_name}
                payerName={profile?.full_name || 'Merchant User'}
                payerEmail={payerEmail}
                payerMobile={payerPhone}
                isRenewal={merchant.subscription_status === 'active' || Boolean(merchant.subscription_expires_at)}
                subscriptionExpiresAt={merchant.subscription_expires_at}
                plans={dynamicPlans}
            />
        </div>
    );
}
