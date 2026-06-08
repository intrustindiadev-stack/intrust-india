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
            return NextResponse.json({ error: 'Already completed or matured' }, { status: 400 });
        }

        // Fetch merchant for notification and balance
        const { data: merchant, error: merError } = await supabase
            .from('merchants')
            .select('user_id, wallet_balance_paise')
            .eq('id', lockin.merchant_id)
            .single();

        if (merError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        const currentBalance = merchant.wallet_balance_paise || 0;

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
                    body: `Your Lockin of ₹${(lockin.amount_paise / 100).toLocaleString('en-IN')} has been settled in cash.`,
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
