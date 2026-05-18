import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WalletService } from '@/lib/wallet/walletService';

export async function POST(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { amount, referenceId, referenceType, description } = await request.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const result = await WalletService.debitWallet(
            user.id,
            amount,
            referenceId,
            referenceType,
            description
        );

        return NextResponse.json({
            success: true,
            transaction: result.data ? result.data : result,
            ...(result.data ? result : {}),
        });
    } catch (error) {
        console.error('Wallet Debit Error:', error);
        // 400 for business-logic errors like insufficient funds
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
