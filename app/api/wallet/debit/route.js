import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WalletService } from '@/lib/wallet/walletService';
import { notifyMerchantTransaction } from '@/lib/notifications/merchantWhatsapp';

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
        notifyMerchantTransaction({
            merchantUserId: user.id,
            amountRs: Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            direction: 'debited from',
            newBalanceRs: ((result.newBalancePaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            source: referenceType === 'SUBSCRIPTION' ? 'Subscription Charge' : 'Wallet Debit',
            dedupeId: referenceId
        }).catch(err => console.error('[wallet/debit] WhatsApp transaction alert failed:', err));

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
