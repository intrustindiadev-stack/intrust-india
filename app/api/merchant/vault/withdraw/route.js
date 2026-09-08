import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req) {
    try {
        const body = await req.json();
        const { merchant_id, amount_paise } = body;

        if (!merchant_id || !amount_paise || amount_paise <= 0) {
            return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
        }

        // 1. Check current vault balance
        const { data: vault, error: vaultError } = await supabase
            .from('ai_orders_vault')
            .select('*')
            .eq('merchant_id', merchant_id)
            .single();

        if (vaultError) throw vaultError;

        if (!vault || vault.balance_paise < amount_paise) {
            return NextResponse.json({ error: 'Insufficient vault balance' }, { status: 400 });
        }

        // 2. Deduct amount from vault immediately (to prevent double spending)
        const newBalance = vault.balance_paise - amount_paise;
        const { error: updateError } = await supabase
            .from('ai_orders_vault')
            .update({ balance_paise: newBalance, updated_at: new Date().toISOString() })
            .eq('id', vault.id);

        if (updateError) throw updateError;

        // 3. Create a PENDING withdrawal transaction
        const { data: txData, error: txError } = await supabase
            .from('ai_orders_vault_transactions')
            .insert([{
                vault_id: vault.id,
                type: 'WITHDRAWAL',
                amount_paise: amount_paise,
                status: 'PENDING',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (txError) throw txError;

        return NextResponse.json({ success: true, transaction: txData, new_balance_paise: newBalance });

    } catch (error) {
        console.error('Withdrawal error:', error);
        return NextResponse.json({ error: 'Failed to process withdrawal request' }, { status: 500 });
    }
}
