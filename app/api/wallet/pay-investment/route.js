import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WalletService } from '@/lib/wallet/walletService';

export async function POST(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { type, amount, description } = await request.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        if (type !== 'merchant_lockin' && type !== 'merchant_aigrow') {
            return NextResponse.json({ error: 'Invalid investment type' }, { status: 400 });
        }

        const amountPaise = Math.round(parseFloat(amount) * 100);

        // 1. Get Merchant ID
        const { data: merchantCheck, error: ownerErr } = await supabaseAdmin
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (ownerErr || !merchantCheck) {
            return NextResponse.json({ error: 'Merchant account not found' }, { status: 403 });
        }

        // 2. Debit the Wallet
        const referenceType = type;
        const referenceId = `WLT_INV_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        const debitResult = await WalletService.debitWallet(
            user.id,
            amount,
            referenceId,
            referenceType,
            description || `Investment via Wallet`
        );

        if (!debitResult || (debitResult.error && !debitResult.success)) {
            throw new Error(debitResult.error || 'Failed to debit wallet');
        }

        // Use the wallet transaction ID as the gateway txn ID for tracking
        const walletTxnId = debitResult.data?.id || referenceId;

        // 3. Create the Investment Record
        if (type === 'merchant_lockin') {
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);

            const { error: lockinErr } = await supabaseAdmin
                .from('merchant_lockin_balances')
                .insert({
                    merchant_id: merchantCheck.id,
                    amount_paise: amountPaise,
                    interest_rate: 15.0, // Standard Lockin APR
                    lockin_period_months: 12,
                    status: 'active',
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString()
                });

            if (lockinErr) throw new Error(`Lockin creation failed: ${lockinErr.message}`);

            await supabaseAdmin.from('notifications').insert({
                user_id: user.id,
                title: 'Growth Portfolio Funded ✅',
                body: `Your Lockin portfolio has been funded with ₹${amount} via Wallet.`,
                type: 'success'
            });

        } else if (type === 'merchant_aigrow') {
            const { error: aiGrowErr } = await supabaseAdmin
                .from('merchant_investments')
                .insert({
                    merchant_id: merchantCheck.id,
                    amount_paise: amountPaise,
                    description: description || 'AI Grow Request',
                    status: 'active',
                    approved_at: new Date().toISOString(),
                    interest_rate_percent: 12.0,
                    duration_days: 365
                });
            
            if (aiGrowErr) throw new Error(`AI Grow creation failed: ${aiGrowErr.message}`);
        }

        return NextResponse.json({
            success: true,
            txnId: walletTxnId,
            message: 'Investment processed successfully'
        });
    } catch (error) {
        console.error('Wallet Investment Error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
