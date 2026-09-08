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
                    merchant_id
                )
            `)
            .eq('id', id)
            .single();

        if (txError) throw txError;
        if (tx.status !== 'PENDING') {
            return NextResponse.json({ error: 'Transaction is not pending' }, { status: 400 });
        }

        const merchantId = tx.ai_orders_vault.merchant_id;
        const amountPaise = tx.amount_paise;

        // 2. Get merchant to update their main wallet_balance_paise
        const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('wallet_balance_paise')
            .eq('id', merchantId)
            .single();

        if (merchantError) throw merchantError;

        const newWalletBalance = (merchant.wallet_balance_paise || 0) + amountPaise;

        // 3. Update merchant wallet
        const { error: updateMerchantError } = await supabase
            .from('merchants')
            .update({ wallet_balance_paise: newWalletBalance })
            .eq('id', merchantId);

        if (updateMerchantError) throw updateMerchantError;

        // 4. Update transaction status to COMPLETED
        const { error: updateTxError } = await supabase
            .from('ai_orders_vault_transactions')
            .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (updateTxError) throw updateTxError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        return NextResponse.json({ error: 'Failed to approve withdrawal' }, { status: 500 });
    }
}
