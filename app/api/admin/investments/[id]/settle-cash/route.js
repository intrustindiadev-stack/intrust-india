import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin: supabase } = await getAuthUser(request);
        
        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch investment details
        const { data: investment, error: invError } = await supabase
            .from('merchant_investments')
            .select('amount_paise, merchant_id, status')
            .eq('id', id)
            .single();

        if (invError || !investment) {
            return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
        }

        if (investment.status === 'completed' || investment.status === 'released') {
            return NextResponse.json({ error: 'Already completed' }, { status: 400 });
        }

        // Fetch merchant for notification and balance
        const { data: merchant, error: merError } = await supabase
            .from('merchants')
            .select('user_id, wallet_balance_paise')
            .eq('id', investment.merchant_id)
            .single();

        if (merError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        const currentBalance = merchant.wallet_balance_paise || 0;

        // 1. Update investment status
        const { error: updateInvError } = await supabase
            .from('merchant_investments')
            .update({ status: 'completed' })
            .eq('id', id);

        if (updateInvError) throw updateInvError;

        // 3. Send notification
        if (merchant?.user_id) {
            try {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'Investment Settled',
                    body: `Your AI Grow investment of ₹${(investment.amount_paise / 100).toLocaleString('en-IN')} has been settled in cash.`,
                    type: 'success',
                    reference_id: id,
                    reference_type: 'investment'
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
