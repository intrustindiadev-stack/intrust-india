import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Server-only helper: debits the authoritative AI Grow vault ledger when an
 * investment principal leaves the AI Grow system (release to wallet / cash
 * settlement). Replaces the old direct UPDATE on a non-existent
 * `balance_paise` column (real column is `balance`, mutated only via RPC).
 *
 * Exported from the release route so the sibling settle-cash route can share
 * the exact same logic.
 *
 * @param {object} opts
 * @param {object} opts.supabase - service-role client
 * @param {string} opts.merchantId
 * @param {number} opts.amountPaise - principal to remove from the ledger
 * @param {string} opts.investmentId
 * @param {string} opts.adminUserId
 * @returns {Promise<void>} - never throws for "wallet missing" (legacy rows
 *   that predate the ledger), throws for every other RPC failure
 */
export async function debitAiGrowVaultForInvestmentExit({ supabase, merchantId, amountPaise, investmentId, adminUserId }) {
    if (!(amountPaise > 0)) return;

    const { error } = await supabase.rpc('adjust_merchant_investment_wallet', {
        p_merchant_id: merchantId,
        p_adjustment_type: 'debit',
        p_amount: Number((amountPaise / 100).toFixed(2)),
        p_admin_id: adminUserId || null,
        p_reason: `AI Grow investment principal exited the vault (release/settlement of investment ${investmentId}).`,
        p_metadata: {
            source: 'investment_release',
            investment_id: investmentId,
            exited_at: new Date().toISOString(),
        },
    });

    if (error) {
        // Legacy rows that never had a ledger wallet: nothing to debit.
        if (error.code === 'P0002' || error.message?.includes('does not exist')) {
            console.warn(`[aiGrowLedger] Skipping vault debit for legacy investment ${investmentId}: no wallet row.`);
            return;
        }
        console.error('[aiGrowLedger] vault debit RPC failed:', error);
        throw new Error(error.message || 'AI Grow vault ledger debit failed.');
    }
}

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin: supabase } = await getAuthUser(request);
        
        if (!user || profile?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Access denied. Super admin role required.' }, { status: 403 });
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
                description: 'AI Grow Capital + Profit Released to Wallet',
                metadata: { reference_id: id, type: 'AI_GROW_RELEASE', principal: investment.amount_paise, profit: totalProfitPaise }
            });

        if (txError) throw txError;

        // 3. Update investment status
        const { error: updateInvError } = await supabase
            .from('merchant_investments')
            .update({ status: 'completed' })
            .eq('id', id);

        if (updateInvError) throw updateInvError;

        // 3.5 Decrement AI Grow Wallet Ledger via the authoritative RPC.
        // The principal is leaving the AI Grow system, so the master ledger
        // must be debited (the real column is `balance`; mutated only via RPC).
        await debitAiGrowVaultForInvestmentExit({
            supabase,
            merchantId: investment.merchant_id,
            amountPaise: investment.amount_paise,
            investmentId: id,
            adminUserId: user.id,
        });

        // 4. Send notification
        try {
            await supabase.from('notifications').insert({
                user_id: merchant.user_id,
                title: 'Growth Plan Released',
                body: `₹${(totalAmountToRelease / 100).toLocaleString('en-IN')} (including profits) from your AI Grow growth plan has been released to your portfolio.`,
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
