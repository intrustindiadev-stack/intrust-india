import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(req) {
    try {
        const { user, profile, admin: supabaseAdmin } = await getAuthUser(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { amount_paise } = body;

        const parsedAmountPaise = Math.round(Number(amount_paise));
        if (!parsedAmountPaise || isNaN(parsedAmountPaise) || parsedAmountPaise <= 0) {
            return NextResponse.json({ error: 'Missing or invalid amount' }, { status: 400 });
        }

        // 1. Check current vault balance for this merchant user
        const { data: vault, error: vaultError } = await supabaseAdmin
            .from('ai_orders_vault')
            .select('*')
            .eq('merchant_id', user.id)
            .single();

        if (vaultError || !vault) {
            return NextResponse.json({ error: 'Vault not found for merchant' }, { status: 404 });
        }

        if (vault.balance_paise < parsedAmountPaise) {
            return NextResponse.json({ error: 'Insufficient vault balance' }, { status: 400 });
        }

        // 2. Deduct amount from vault immediately
        const newBalance = vault.balance_paise - parsedAmountPaise;
        const { error: updateError } = await supabaseAdmin
            .from('ai_orders_vault')
            .update({ balance_paise: newBalance, updated_at: new Date().toISOString() })
            .eq('id', vault.id);

        if (updateError) throw updateError;

        // 3. Create a PENDING withdrawal transaction with required balance ledger columns
        const { data: txData, error: txError } = await supabaseAdmin
            .from('ai_orders_vault_transactions')
            .insert([{
                vault_id: vault.id,
                type: 'WITHDRAWAL',
                amount_paise: parsedAmountPaise,
                balance_before_paise: vault.balance_paise,
                balance_after_paise: newBalance,
                status: 'PENDING',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (txError) throw txError;

        return NextResponse.json({ success: true, transaction: txData, new_balance_paise: newBalance });

    } catch (error) {
        console.error('Withdrawal error:', error);
        return NextResponse.json({ error: error.message || 'Failed to process withdrawal request' }, { status: 500 });
    }
}

