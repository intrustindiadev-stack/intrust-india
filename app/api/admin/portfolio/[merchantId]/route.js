import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { merchantId } = await params;
        const supabase = createAdminClient();

        // 1. Auth & Admin Check
        const { data: { user } } = await supabase.auth.getUser(request.headers.get('authorization')?.replace('Bearer ', ''));
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Fetch Merchant details
        const { data: merchant, error: mError } = await supabase
            .from('merchants')
            .select(`
                id, business_name, user_id, wallet_balance_paise,
                user_profiles(full_name, email, phone)
            `)
            .eq('id', merchantId)
            .single();

        if (mError) throw mError;
        if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });

        // 3. Fetch AI Grow Investments
        const { data: aiGrow, error: aError } = await supabase
            .from('merchant_investments')
            .select('*')
            .eq('merchant_id', merchantId)
            .order('created_at', { ascending: false });

        if (aError) throw aError;

        // 3b. Fetch simulated orders for these investments
        const investmentIds = (aiGrow || []).map(i => i.id);
        let orders = [];
        if (investmentIds.length > 0) {
            const { data: orderData } = await supabase
                .from('merchant_investment_orders')
                .select('*')
                .in('investment_id', investmentIds)
                .order('order_date', { ascending: false });
            orders = orderData || [];
        }

        const enrichedAiGrow = (aiGrow || []).map(inv => {
            const invOrders = orders.filter(o => o.investment_id === inv.id);
            const totalPaid = invOrders.reduce((s, o) => s + (o.profit_paise || 0), 0);
            return {
                ...inv,
                total_profit_paid_paise: totalPaid,
                order_count: invOrders.length,
                orders: invOrders,
                latest_order: invOrders[0] || null
            };
        });

        // 4. Fetch Lockin Balances
        const { data: lockin, error: lError } = await supabase
            .from('merchant_lockin_balances')
            .select('*')
            .eq('merchant_id', merchantId)
            .order('created_at', { ascending: false });

        if (lError) throw lError;

        // 5. Fetch AI Grow Wallet — the authoritative vault ledger.
        //    (`.single()` errors when the row is missing — treat as legacy/no-wallet.)
        const { data: aiGrowWallet } = await supabase
            .from('ai_grow_wallets')
            .select('balance')
            .eq('merchant_id', merchantId)
            .single();

        const walletRowExists = Boolean(aiGrowWallet);
        const aiWalletBalance = Math.round((aiGrowWallet?.balance || 0) * 100);

        // Calculate totals
        const activeAiGrowAmount = aiGrow.filter(i => i.status === 'active').reduce((sum, i) => sum + i.amount_paise, 0);
        const activeLockinAmount = lockin.filter(l => l.status === 'active').reduce((sum, l) => sum + l.amount_paise, 0);

        // VAULT figure must be the authoritative ledger (ai_grow_wallets.balance) —
        // the same value the settle-vault flow validates against. Previously this
        // was Math.max(wallet, active principal), which inflated the card whenever
        // active investment rows drifted above the ledger (e.g. after a partial
        // vault settlement that debited the ledger but left rows active).
        // Fallback to active principal only for legacy merchants with no wallet row.
        const finalAiGrowAmount = walletRowExists ? aiWalletBalance : activeAiGrowAmount;

        return NextResponse.json({
            data: {
                merchant: {
                    ...merchant,
                    total_active_capital_paise: finalAiGrowAmount + activeLockinAmount,
                    total_ai_grow_paise: finalAiGrowAmount,
                    total_lockin_paise: activeLockinAmount,
                    ai_grow_wallet_balance: aiWalletBalance,
                    ai_grow_vault_balance_rupees: Number(aiGrowWallet?.balance || 0),
                    // Distinct metric: principal currently in active plan rows
                    // (may legitimately differ from the vault ledger).
                    active_investment_principal_paise: activeAiGrowAmount,
                    ai_grow_wallet_row_exists: walletRowExists,
                },
                investments: enrichedAiGrow || [],
                lockins: lockin || [],
                is_super_admin: profile?.role === 'super_admin'
            }
        });
    } catch (err) {
        console.error('Portfolio API error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
