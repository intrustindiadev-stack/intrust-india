import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { WalletService } from '@/lib/wallet/walletService';
import { MERCHANT_INVESTMENT_TERMS } from '@/lib/constants';

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
        const { type, amount, description, idempotencyKey } = await request.json();

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        if (type !== 'merchant_lockin' && type !== 'merchant_aigrow') {
            return NextResponse.json({ error: 'Invalid investment type' }, { status: 400 });
        }

        if (!idempotencyKey) {
            return NextResponse.json({ error: 'Idempotency key is required' }, { status: 400 });
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
        const referenceId = `WLT_INV_${idempotencyKey}`;
        
        // Pre-check Idempotency
        if (type === 'merchant_lockin') {
            const { data: existing } = await supabaseAdmin.from('merchant_lockin_balances').select('id').eq('gateway_txn_id', referenceId).maybeSingle();
            if (existing) return NextResponse.json({ success: true, txnId: referenceId, message: 'Investment already processed' });
        } else {
            const { data: existing } = await supabaseAdmin.from('merchant_investments').select('id').eq('gateway_txn_id', referenceId).maybeSingle();
            if (existing) return NextResponse.json({ success: true, txnId: referenceId, message: 'Investment already processed' });
        }
        
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
            endDate.setMonth(endDate.getMonth() + MERCHANT_INVESTMENT_TERMS.LOCKIN.DURATION_MONTHS);

            const { error: lockinErr } = await supabaseAdmin
                .from('merchant_lockin_balances')
                .insert({
                    merchant_id: merchantCheck.id,
                    amount_paise: amountPaise,
                    interest_rate: MERCHANT_INVESTMENT_TERMS.LOCKIN.INTEREST_RATE_PERCENT,
                    lockin_period_months: MERCHANT_INVESTMENT_TERMS.LOCKIN.DURATION_MONTHS,
                    status: 'active',
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    gateway_txn_id: referenceId,
                    notes: description
                });

            if (lockinErr) {
                // Rollback debit
                await WalletService.creditWallet(user.id, amount, `${referenceId}_ROLLBACK`, 'REFUND', `Rollback for failed lockin investment`);
                
                if (lockinErr.code === '23505') {
                    console.warn(`[WalletInvestment] Unique constraint hit for txn ${referenceId} - concurrent duplicate suppressed and rolled back.`);
                } else {
                    throw new Error(`Lockin creation failed: ${lockinErr.message}`);
                }
            } else {
                await supabaseAdmin.from('notifications').insert({
                    user_id: user.id,
                    title: 'Growth Portfolio Funded ✅',
                    body: `Your Lockin portfolio has been funded with ₹${amount} via Wallet.`,
                    type: 'success'
                });
            }

        } else if (type === 'merchant_aigrow') {
            const { error: aiGrowErr } = await supabaseAdmin
                .from('merchant_investments')
                .insert({
                    merchant_id: merchantCheck.id,
                    amount_paise: amountPaise,
                    description: description || 'AI Grow Request',
                    status: 'active',
                    approved_at: new Date().toISOString(),
                    interest_rate_percent: MERCHANT_INVESTMENT_TERMS.AIGROW.INTEREST_RATE_PERCENT,
                    duration_days: MERCHANT_INVESTMENT_TERMS.AIGROW.DURATION_DAYS,
                    gateway_txn_id: referenceId
                });
            
            if (aiGrowErr) {
                // Rollback debit
                await WalletService.creditWallet(user.id, amount, `${referenceId}_ROLLBACK`, 'REFUND', `Rollback for failed AI Grow investment`);
                
                if (aiGrowErr.code === '23505') {
                    console.warn(`[WalletInvestment] Unique constraint hit for txn ${referenceId} - concurrent duplicate suppressed and rolled back.`);
                } else {
                    throw new Error(`AI Grow creation failed: ${aiGrowErr.message}`);
                }
            }
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
