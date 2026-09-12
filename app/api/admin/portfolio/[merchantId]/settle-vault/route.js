import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

/**
 * POST /api/admin/portfolio/[merchantId]/settle-vault
 *
 * Super-admin only endpoint to settle/release funds from a merchant's
 * AI Grow Vault directly into their active Merchant Wallet balance.
 *
 * Operations:
 * 1. Validates caller is super_admin.
 * 2. Debits ai_grow_wallets via the atomic adjust_merchant_investment_wallet RPC.
 * 3. Credits merchants.wallet_balance_paise.
 * 4. Inserts immutable merchant_transactions ledger record.
 * 5. Sends merchant in-app notification.
 * 6. Records audit_logs entry.
 */
export async function POST(request, { params }) {
    try {
        const { merchantId } = await params;
        const { user, profile, admin: supabase } = await getAuthUser(request);

        // 1. Super Admin Authorization
        if (!user || profile?.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Access denied. Super admin role required to settle AI Grow Vault.' },
                { status: 403 }
            );
        }

        // 2. Parse & Validate Request Body
        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
        }

        const amount = Number(body.amount);
        const settlementType = body.settlement_type || 'Full Principal Liquidation';
        const reason = body.reason?.trim() || 'AI Grow Vault Settlement to Merchant Wallet';

        if (isNaN(amount) || amount <= 0) {
            return NextResponse.json(
                { error: 'Invalid settlement amount. Amount must be greater than zero.' },
                { status: 400 }
            );
        }

        // 3. Fetch Merchant details
        const { data: merchant, error: merError } = await supabase
            .from('merchants')
            .select('id, business_name, user_id, wallet_balance_paise')
            .eq('id', merchantId)
            .single();

        if (merError || !merchant) {
            return NextResponse.json({ error: 'Merchant not found.' }, { status: 404 });
        }

        // 4. Fetch AI Grow Wallet
        const { data: aiWallet, error: walletError } = await supabase
            .from('ai_grow_wallets')
            .select('id, balance, status')
            .eq('merchant_id', merchantId)
            .single();

        if (walletError || !aiWallet) {
            return NextResponse.json({ error: 'AI Grow Vault not found for this merchant.' }, { status: 404 });
        }

        if (aiWallet.status !== 'active') {
            return NextResponse.json(
                { error: `AI Grow Vault is ${aiWallet.status}. Settlements are only permitted on active vaults.` },
                { status: 409 }
            );
        }

        const currentVaultBalance = Number(aiWallet.balance || 0);
        if (amount > currentVaultBalance) {
            return NextResponse.json(
                { 
                    error: `Settlement amount (₹${amount.toLocaleString('en-IN')}) exceeds current AI Grow Vault balance (₹${currentVaultBalance.toLocaleString('en-IN')}).` 
                },
                { status: 400 }
            );
        }

        // 5. Invoke atomic debit RPC on AI Grow Wallet
        const { data: rpcData, error: rpcError } = await supabase.rpc('adjust_merchant_investment_wallet', {
            p_merchant_id: merchantId,
            p_adjustment_type: 'debit',
            p_amount: amount,
            p_admin_id: user.id,
            p_reason: `Vault Settlement to Wallet: ${settlementType}. ${reason}`,
            p_metadata: {
                action: 'vault_settlement_to_wallet',
                settlement_type: settlementType,
                merchant_business_name: merchant.business_name,
                admin_email: user.email || 'unknown',
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
            }
        });

        if (rpcError) {
            console.error('[settle-vault] RPC Debit Error:', rpcError);
            return NextResponse.json(
                { error: rpcError.message || 'Failed to debit AI Grow Vault.' },
                { status: 400 }
            );
        }

        // 6. Credit Merchant Wallet Balance (in Paise)
        const amountPaise = Math.round(amount * 100);
        const currentWalletPaise = Number(merchant.wallet_balance_paise || 0);
        const newWalletBalancePaise = currentWalletPaise + amountPaise;

        const { error: updateMerError } = await supabase
            .from('merchants')
            .update({ wallet_balance_paise: newWalletBalancePaise })
            .eq('id', merchantId);

        if (updateMerError) {
            console.error('[settle-vault] Error crediting merchant wallet:', updateMerError);
            return NextResponse.json(
                { error: 'Vault debited but failed to credit merchant wallet. Please contact tech support.' },
                { status: 500 }
            );
        }

        // 7. Insert into merchant_transactions ledger
        const { error: txError } = await supabase
            .from('merchant_transactions')
            .insert({
                merchant_id: merchantId,
                transaction_type: 'wallet_topup',
                amount_paise: amountPaise,
                commission_paise: 0,
                balance_after_paise: newWalletBalancePaise,
                description: `AI Grow Vault Settlement: ₹${amount.toLocaleString('en-IN')}`,
                metadata: {
                    source: 'ai_grow_vault',
                    settlement_type: settlementType,
                    reason: reason,
                    vault_transaction_id: rpcData?.transaction_id,
                    admin_id: user.id,
                    admin_email: user.email || null,
                    settled_at: new Date().toISOString()
                }
            });

        if (txError) {
            console.warn('[settle-vault] Warning inserting merchant transaction ledger:', txError);
        }

        // 8. Send Notification to Merchant
        if (merchant.user_id) {
            try {
                await supabase.from('notifications').insert({
                    user_id: merchant.user_id,
                    title: 'AI Grow Vault Funds Settled',
                    body: `₹${amount.toLocaleString('en-IN')} from your AI Grow Vault has been settled into your active Merchant Wallet. New wallet balance: ₹${(newWalletBalancePaise / 100).toLocaleString('en-IN')}.`,
                    type: 'success',
                    reference_id: rpcData?.transaction_id,
                    reference_type: 'vault_settlement'
                });
            } catch (notifErr) {
                console.warn('[settle-vault] Notification error:', notifErr);
            }
        }

        // 9. Audit Log
        try {
            await supabase.from('audit_logs').insert({
                actor_id: user.id,
                actor_role: 'super_admin',
                action: 'admin_action',
                entity_type: 'ai_grow_vault_settlement',
                entity_id: merchantId,
                description: `Settled ₹${amount.toLocaleString('en-IN')} from AI Grow Vault to Merchant Wallet for ${merchant.business_name}`,
                metadata: {
                    merchant_id: merchantId,
                    amount_inr: amount,
                    settlement_type: settlementType,
                    reason: reason,
                    previous_vault_balance: rpcData?.previous_balance,
                    new_vault_balance: rpcData?.new_balance,
                    previous_wallet_paise: currentWalletPaise,
                    new_wallet_paise: newWalletBalancePaise,
                    vault_tx_id: rpcData?.transaction_id
                }
            });
        } catch (auditErr) {
            console.warn('[settle-vault] Audit log error:', auditErr);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully settled ₹${amount.toLocaleString('en-IN')} from AI Grow Vault to Merchant Wallet.`,
            data: {
                settled_amount: amount,
                previous_vault_balance: rpcData?.previous_balance,
                new_vault_balance: rpcData?.new_balance,
                previous_wallet_paise: currentWalletPaise,
                new_wallet_balance_paise: newWalletBalancePaise,
                transaction_id: rpcData?.transaction_id
            }
        });

    } catch (err) {
        console.error('[settle-vault] Internal server error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
    }
}
