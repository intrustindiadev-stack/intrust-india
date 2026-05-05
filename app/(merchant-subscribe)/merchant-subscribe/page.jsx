import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import MerchantSubscriptionPayButton from '@/components/merchant/MerchantSubscriptionPayButton';
import { getPricingSettings } from '@/app/(admin)/admin/settings/actions';

export const dynamic = 'force-dynamic';

export default async function MerchantSubscribePage() {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: merchant } = await supabase
        .from('merchants')
        .select('id, status, subscription_status, subscription_expires_at, business_name')
        .eq('user_id', user.id)
        .single();

    if (!merchant) redirect('/merchant-apply');
    if (merchant.status === 'pending') redirect('/merchant-status/pending');
    if (merchant.status === 'rejected') redirect('/merchant-status/rejected');
    if (merchant.status === 'suspended') redirect('/merchant-status/suspended');
    if (merchant.subscription_status === 'active') redirect('/merchant/dashboard');
    if (merchant.status !== 'approved') redirect('/merchant-apply');

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single();

    const pricing = await getPricingSettings();

    const dynamicPlans = [
        {
            key: 'MSUB_1M',
            label: '1 Month',
            price: pricing.sub1m,
            priceFormatted: pricing.sub1m.toFixed(2),
            durationDays: 30,
            description: null,
        },
        {
            key: 'MSUB_6M',
            label: '6 Months',
            price: pricing.sub6m,
            priceFormatted: pricing.sub6m.toFixed(2),
            durationDays: 180,
            description: 'Best Value',
        },
        {
            key: 'MSUB_12M',
            label: '12 Months',
            price: pricing.sub12m,
            priceFormatted: pricing.sub12m.toFixed(2),
            durationDays: 365,
            description: 'Most Savings',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <MerchantSubscriptionPayButton
                merchantId={merchant.id}
                businessName={merchant.business_name}
                payerName={profile?.full_name || 'Merchant User'}
                payerEmail={profile?.email || 'merchant@example.com'}
                payerMobile={profile?.phone || '9999999999'}
                isRenewal={merchant.subscription_status === 'active'}
                subscriptionExpiresAt={merchant.subscription_expires_at}
                plans={dynamicPlans}
            />
        </div>
    );
}
