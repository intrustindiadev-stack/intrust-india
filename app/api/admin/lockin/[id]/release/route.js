import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin: supabase } = await getAuthUser(request);
        
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch lockin details
        const { data: lockin, error: lockinError } = await supabase
            .from('merchant_lockin_balances')
            .select('amount_paise, merchant_id, status')
            .eq('id', id)
            .single();

        if (lockinError || !lockin) {
            return NextResponse.json({ error: 'Lockin not found' }, { status: 404 });
        }

        if (lockin.status === 'completed' || lockin.status === 'matured' || lockin.status === 'released') {
            return NextResponse.json({ error: 'Already released or matured' }, { status: 400 });
        }

        // Fetch merchant
        const { data: merchant, error: merError } = await supabase
            .from('merchants')
            .select('wallet_balance_paise, user_id')
            .eq('id', lockin.merchant_id)
            .single();

        if (merError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // Calculate accumulated interest
        const principalPaise = lockin.amount_paise;
        const rate = (lockin.interest_rate || lockin.interest_rate_percent || 0) / 100;
        let interestPaise = 0;
        if (lockin.start_date) {
            const startDate = new Date(lockin.start_date);
            const daysElapsed = Math.max(0, (new Date() - startDate) / (1000 * 60 * 60 * 24));
            interestPaise = Math.round(principalPaise * (rate / 365) * daysElapsed);
        }
        const totalAmountToRelease = principalPaise + interestPaise;

        // 1. Update merchant wallet balance
        const newBalance = (merchant.wallet_balance_paise || 0) + totalAmountToRelease;
        const { error: updateMerError } = await supabase
            .from('merchants')
            .update({ wallet_balance_paise: newBalance })
            .eq('id', lockin.merchant_id);

        if (updateMerError) throw updateMerError;

        // 2. Create transaction record
        const { error: txError } = await supabase
            .from('merchant_transactions')
            .insert({
                merchant_id: lockin.merchant_id,
                transaction_type: 'wallet_topup',
                amount_paise: totalAmountToRelease,
                balance_after_paise: newBalance,
                description: 'Lockin + Interest Released to Wallet',
                metadata: { reference_id: id, type: 'LOCKIN_RELEASE', principal: principalPaise, interest: interestPaise }
            });

        if (txError) throw txError;

        // 3. Update lockin status
        const { error: updateLockinError } = await supabase
            .from('merchant_lockin_balances')
            .update({ status: 'matured' })
            .eq('id', id);

        if (updateLockinError) throw updateLockinError;

        // 4. Send notification
        try {
            await supabase.from('notifications').insert({
                user_id: merchant.user_id,
                title: 'Lockin Released',
                body: `₹${(totalAmountToRelease / 100).toLocaleString('en-IN')} (including interest) from your Lockin has been released to your portfolio.`,
                type: 'success',
                reference_id: id,
                reference_type: 'lockin_balance'
            });
        } catch (notifErr) {
            console.error('Notification error:', notifErr);
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('Release error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
