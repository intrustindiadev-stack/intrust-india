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
            return NextResponse.json({ error: 'Already released' }, { status: 400 });
        }

        // Fetch merchant
        const { data: merchant, error: merError } = await supabase
            .from('merchants')
            .select('wallet_balance_paise, user_id')
            .eq('id', investment.merchant_id)
            .single();

        if (merError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // Fetch associated orders to calculate profit
        const { data: orders } = await supabase
            .from('merchant_investment_orders')
            .select('profit_paise')
            .eq('investment_id', id);
        
        const totalProfitPaise = orders?.reduce((sum, order) => sum + (order.profit_paise || 0), 0) || 0;
        const totalAmountToRelease = investment.amount_paise + totalProfitPaise;

        // 1. Update merchant wallet balance
        const newBalance = (merchant.wallet_balance_paise || 0) + totalAmountToRelease;
        const { error: updateMerError } = await supabase
            .from('merchants')
            .update({ wallet_balance_paise: newBalance })
            .eq('id', investment.merchant_id);

        if (updateMerError) throw updateMerError;

        // 2. Create transaction record
        const { error: txError } = await supabase
            .from('merchant_transactions')
            .insert({
                merchant_id: investment.merchant_id,
                transaction_type: 'wallet_topup',
                amount_paise: totalAmountToRelease,
                balance_after_paise: newBalance,
                description: 'AI Grow Investment + Profit Released to Wallet',
                metadata: { reference_id: id, type: 'AI_GROW_RELEASE', principal: investment.amount_paise, profit: totalProfitPaise }
            });

        if (txError) throw txError;

        // 3. Update investment status
        const { error: updateInvError } = await supabase
            .from('merchant_investments')
            .update({ status: 'completed' })
            .eq('id', id);

        if (updateInvError) throw updateInvError;

        // 4. Send notification
        try {
            await supabase.from('notifications').insert({
                user_id: merchant.user_id,
                title: 'Investment Released',
                body: `₹${(totalAmountToRelease / 100).toLocaleString('en-IN')} (including profits) from your AI Grow investment has been released to your portfolio.`,
                type: 'success',
                reference_id: id,
                reference_type: 'investment'
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
