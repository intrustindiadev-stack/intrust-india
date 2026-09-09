import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(req);

        if (!user || !['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get the transaction and verify it's PENDING
        const { data: tx, error: txError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .select('*')
            .eq('id', id)
            .single();

        if (txError || !tx) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        if (tx.status !== 'PENDING') {
            return NextResponse.json({ error: 'Transaction is not pending' }, { status: 400 });
        }

        const vaultId = tx.vault_id;
        const { data: vault, error: vaultError } = await supabaseAdmin
            .from('ai_orders_vault')
            .select('id, balance_paise, merchant_id')
            .eq('id', vaultId)
            .single();

        if (vaultError || !vault) {
            return NextResponse.json({ error: 'Vault not found' }, { status: 404 });
        }

        const currentVaultBalance = vault.balance_paise || 0;
        const amountPaise = tx.amount_paise;

        // 2. Refund the amount back to the vault
        const newVaultBalance = currentVaultBalance + amountPaise;
        const { error: updateVaultError } = await supabaseAdmin
            .from('ai_orders_vault')
            .update({ balance_paise: newVaultBalance, updated_at: new Date().toISOString() })
            .eq('id', vaultId);

        if (updateVaultError) throw updateVaultError;

        // 3. Update transaction status to REJECTED
        const { error: updateTxError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .update({ status: 'REJECTED' })
            .eq('id', id);

        if (updateTxError) throw updateTxError;

        // 4. Notify merchant about rejection and refund
        const merchantUserId = vault.merchant_id;
        const amountRupees = amountPaise / 100;
        const formattedAmount = amountRupees.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        if (merchantUserId) {
            try {
                await supabaseAdmin.from('notifications').insert({
                    user_id: merchantUserId,
                    title: 'Vault Withdrawal Rejected ❌',
                    body: `Your AI Orders Vault withdrawal request of ₹${formattedAmount} was rejected. Funds have been refunded to your vault.`,
                    type: 'error',
                    priority: 'HIGH',
                    reference_type: 'ai_orders_withdrawal',
                    reference_id: id,
                    action_url: '/merchant/vault/transactions',
                    metadata: {
                        transaction_id: id,
                        amount_paise: amountPaise,
                        amount_rupees: amountRupees,
                        rejected_by: user.id
                    }
                });
            } catch (notifErr) {
                console.warn('[Reject Withdrawal] Merchant in-app notification error:', notifErr?.message);
            }

            // Best-effort WhatsApp status alert to merchant
            try {
                const { notifyMerchantPayoutStatus } = await import('@/lib/notifications/merchantWhatsapp');
                notifyMerchantPayoutStatus({
                    merchantUserId,
                    amountRs: amountRupees,
                    status: 'REJECTED',
                    note: 'Refunded to AI Orders Vault'
                }).catch(() => {});
            } catch (waErr) {
                console.warn('[Reject Withdrawal] Merchant WhatsApp alert error:', waErr?.message);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        return NextResponse.json({ error: error.message || 'Failed to reject withdrawal' }, { status: 500 });
    }
}


