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
            .select('id, balance_paise')
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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        return NextResponse.json({ error: error.message || 'Failed to reject withdrawal' }, { status: 500 });
    }
}

