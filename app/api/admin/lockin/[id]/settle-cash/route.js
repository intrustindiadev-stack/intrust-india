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
            .select('amount_paise, merchant_id, status, start_date, end_date, interest_rate')
            .eq('id', id)
            .single();

        if (lockinError || !lockin) {
            return NextResponse.json({ error: 'Lockin not found' }, { status: 404 });
        }

        if (lockin.status === 'completed' || lockin.status === 'matured' || lockin.status === 'released') {
            return NextResponse.json({ error: 'Already completed or matured' }, { status: 400 });
        }

        if (lockin.end_date && new Date() < new Date(lockin.end_date)) {
            return NextResponse.json({ error: 'Cannot settle before maturity date' }, { status: 400 });
        }

        // Fetch merchant for notification
        const { data: merchant, error: merError } = await supabase
            .from('merchants')
            .select('user_id, wallet_balance_paise')
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
            const endDate = lockin.end_date ? new Date(lockin.end_date) : new Date();
            const boundedEnd = Math.min(new Date().getTime(), endDate.getTime());
            const daysElapsed = Math.max(0, boundedEnd - startDate.getTime()) / (1000 * 60 * 60 * 24);
            interestPaise = Math.round(principalPaise * (rate / 365) * daysElapsed);
        }
        const totalSettledPaise = principalPaise + interestPaise;

        // 1. Update lockin status
        const { error: updateLockinError } = await supabase
            .from('merchant_lockin_balances')
            .update({ status: 'matured' })
            .eq('id', id);

        if (updateLockinError) throw updateLockinError;

        // 3. Send notification
        if (merchant?.user_id) {
            try {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'Lockin Settled',
                    body: `Your Lockin of ₹${(totalSettledPaise / 100).toLocaleString('en-IN')} (including interest) has been settled offline (cash/bank transfer).`,
                    type: 'success',
                    reference_id: id,
                    reference_type: 'lockin_balance'
                });
            } catch (notifErr) {
                console.error('Notification error:', notifErr);
            }
        }

        return NextResponse.json({ success: true });

    } catch (err) {
        console.error('Settle cash error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
