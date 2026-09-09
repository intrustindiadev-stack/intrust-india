import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { WalletService } from '@/lib/wallet/walletService';

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

        // Fetch associated vault to retrieve merchant_id
        const { data: vault, error: vaultError } = await supabaseAdmin
            .from('ai_orders_vault')
            .select('id, merchant_id')
            .eq('id', tx.vault_id)
            .single();

        if (vaultError || !vault) {
            return NextResponse.json({ error: 'Associated vault not found' }, { status: 404 });
        }

        const merchantUserId = vault.merchant_id;
        const amountPaise = tx.amount_paise;

        if (!merchantUserId || !amountPaise) {
            return NextResponse.json({ error: 'Invalid transaction record' }, { status: 400 });
        }

        // 2. Credit merchant's main wallet via WalletService
        const amountRupees = amountPaise / 100;
        await WalletService.creditWallet(
            merchantUserId,
            amountRupees,
            id,
            'ai_orders_vault_withdrawal',
            `AI Orders Vault withdrawal credit (Tx: ${id})`
        );

        // 3. Update transaction status to COMPLETED
        const { error: updateTxError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .update({ status: 'COMPLETED' })
            .eq('id', id);

        if (updateTxError) throw updateTxError;

        // 4. Notify merchant about approval
        const formattedAmount = amountRupees.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        try {
            await supabaseAdmin.from('notifications').insert({
                user_id: merchantUserId,
                title: 'Vault Withdrawal Approved ✅',
                body: `Your AI Orders Vault withdrawal of ₹${formattedAmount} has been approved and credited to your wallet.`,
                type: 'success',
                priority: 'HIGH',
                reference_type: 'ai_orders_withdrawal',
                reference_id: id,
                action_url: '/merchant/wallet',
                metadata: {
                    transaction_id: id,
                    amount_paise: amountPaise,
                    amount_rupees: amountRupees,
                    approved_by: user.id
                }
            });
        } catch (notifErr) {
            console.warn('[Approve Withdrawal] Merchant in-app notification error:', notifErr?.message);
        }

        // Best-effort WhatsApp status alert to merchant
        try {
            const { notifyMerchantPayoutStatus } = await import('@/lib/notifications/merchantWhatsapp');
            notifyMerchantPayoutStatus({
                merchantUserId,
                amountRs: amountRupees,
                status: 'APPROVED',
                note: 'Credited to InTrust Wallet'
            }).catch(() => {});
        } catch (waErr) {
            console.warn('[Approve Withdrawal] Merchant WhatsApp alert error:', waErr?.message);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        return NextResponse.json({ error: error.message || 'Failed to approve withdrawal' }, { status: 500 });
    }
}


