import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req, { params }) {
    try {
        const { id } = params;

        // 1. Get the transaction and verify it's PENDING
        const { data: tx, error: txError } = await supabase
            .from('ai_orders_vault_transactions')
            .select(`
                *,
                ai_orders_vault (
                    id,
                    balance_paise
                )
            `)
            .eq('id', id)
            .single();

        if (txError) throw txError;
        if (tx.status !== 'PENDING') {
            return NextResponse.json({ error: 'Transaction is not pending' }, { status: 400 });
        }

        const vaultId = tx.ai_orders_vault.id;
        const currentVaultBalance = tx.ai_orders_vault.balance_paise;
        const amountPaise = tx.amount_paise;

        // 2. Refund the amount back to the vault
        const newVaultBalance = currentVaultBalance + amountPaise;
        const { error: updateVaultError } = await supabase
            .from('ai_orders_vault')
            .update({ balance_paise: newVaultBalance, updated_at: new Date().toISOString() })
            .eq('id', vaultId);

        if (updateVaultError) throw updateVaultError;

        // 3. Update transaction status to REJECTED
        const { error: updateTxError } = await supabase
            .from('ai_orders_vault_transactions')
            .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (updateTxError) throw updateTxError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        return NextResponse.json({ error: 'Failed to reject withdrawal' }, { status: 500 });
    }
}
