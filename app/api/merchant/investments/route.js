import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
// GET /api/merchant/investments — fetch all investments + aggregated order profit + ai grow wallet
export async function GET(request) {
    try {
        const { user, admin: supabase } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });

        const { data: investments, error } = await supabase
            .from('merchant_investments')
            .select('*')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch all orders for this merchant's investments
        const investmentIds = (investments || []).map(i => i.id);
        let orders = [];
        if (investmentIds.length > 0) {
            const { data: orderData } = await supabase
                .from('merchant_investment_orders')
                .select('*')
                .in('investment_id', investmentIds)
                .order('order_date', { ascending: false });
            orders = orderData || [];
        }

        // Fetch the authoritative AI Grow wallet balance (managed by admin ledger).
        // Merchants can read their own row via the RLS policy added in
        // 20260912_ai_grow_wallet_merchant_rls.sql.
        const { data: wallet } = await supabase
            .from('ai_grow_wallets')
            .select('id, balance, currency, status, updated_at')
            .eq('merchant_id', merchant.id)
            .single();

        // Fetch wallet adjustment transactions so the merchant can see admin credits/debits
        // in their activity feed (RLS policy allows merchants to read their own txns).
        let walletTxns = [];
        if (wallet?.id) {
            const { data: txnData } = await supabase
                .from('ai_grow_wallet_transactions')
                .select('id, transaction_type, amount, previous_balance, new_balance, reason, created_at')
                .eq('wallet_id', wallet.id)
                .order('created_at', { ascending: false })
                .limit(50);
            walletTxns = txnData || [];
        }

        return NextResponse.json({ data: investments || [], allOrders: orders, wallet: wallet || null, walletTxns });

    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

