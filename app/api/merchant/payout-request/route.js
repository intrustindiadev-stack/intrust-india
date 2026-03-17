import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

// GET  /api/merchant/payout-request  — merchant's own payout request history
// POST /api/merchant/payout-request  — submit a new payout request
export async function GET() {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const admin = createAdminClient();
        const { data, error } = await admin
            .from('payout_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('requested_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ requests: data });
    } catch (error) {
        console.error('[API] Payout GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { amount, source = 'wallet', reference_id } = body;

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const amountNum = Number(Number(amount).toFixed(2));
        const admin = createAdminClient();

        // 1. Fetch merchant — must have bank_verified = true
        const { data: merchant, error: mErr } = await admin
            .from('merchants')
            .select('id, wallet_balance_paise, bank_verified, bank_data, status')
            .eq('user_id', user.id)
            .single();

        if (mErr || !merchant) {
            return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 });
        }

        if (merchant.status !== 'approved') {
            return NextResponse.json({ error: 'Merchant account is not approved yet' }, { status: 403 });
        }

        if (!merchant.bank_verified) {
            return NextResponse.json({
                error: 'Bank account not verified. Please complete bank verification in KYC settings before withdrawing.'
            }, { status: 403 });
        }

        // 2. Check balance/eligibility based on source
        const amountPaise = Math.round(amountNum * 100);
        const MIN_PAISE = 10000; // ₹100 minimum withdrawal

        if (amountPaise < MIN_PAISE) {
            return NextResponse.json({ error: 'Minimum withdrawal amount is ₹100' }, { status: 400 });
        }

        if (source === 'growth_fund') {
            if (!reference_id) return NextResponse.json({ error: 'Contract ID required for Growth Fund payout' }, { status: 400 });

            // Fetch contract
            const { data: contract, error: cErr } = await admin
                .from('merchant_lockin_balances')
                .select('*')
                .eq('id', reference_id)
                .eq('merchant_id', merchant.id)
                .single();

            if (cErr || !contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
            if (contract.status !== 'matured') {
                return NextResponse.json({ error: 'Only unlocked (matured) growth funds can be requested for payout.' }, { status: 400 });
            }

            const totalMaturity = (contract.amount_paise + (contract.accumulated_interest_paise || 0)) / 100;
            if (Math.abs(amountNum - totalMaturity) > 0.01) {
                return NextResponse.json({ error: 'Incorrect maturity amount' }, { status: 400 });
            }

            // Mark contract as payout_requested
            const { error: upErr } = await admin
                .from('merchant_lockin_balances')
                .update({ status: 'payout_requested' })
                .eq('id', contract.id);

            if (upErr) throw upErr;

        } else {
            // Standard Wallet Payout
            const balancePaise = merchant.wallet_balance_paise || 0;
            if (amountPaise > balancePaise) {
                return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
            }

            // Deduct from wallet (hold the amount)
            const { error: walletErr } = await admin
                .from('merchants')
                .update({ wallet_balance_paise: balancePaise - amountPaise })
                .eq('id', merchant.id);

            if (walletErr) throw walletErr;
        }

        // 3. Check for existing pending request (source-specific check)
        const { data: existingPending } = await admin
            .from('payout_requests')
            .select('id')
            .eq('merchant_id', merchant.id)
            .eq('payout_source', source)
            .eq('status', 'pending')
            .limit(1);

        if (existingPending && existingPending.length > 0) {
            return NextResponse.json({
                error: 'You already have a pending payout request for this source.'
            }, { status: 409 });
        }

        // 4. Extract bank details from bank_data
        const bankData = (merchant.bank_data && typeof merchant.bank_data === 'object') ? merchant.bank_data : {};
        const bankAccountNumber = bankData.account_number || 'N/A';
        const bankIfsc = bankData.ifsc || bankData.ifsc_code || 'N/A';
        const bankHolder = bankData.name || bankData.account_holder_name || bankData.beneficiary_name || 'N/A';
        const bankName = bankData.bank_name || null;

        // 5. Create payout request record
        const { data: payoutReq, error: prErr } = await admin
            .from('payout_requests')
            .insert({
                merchant_id: merchant.id,
                user_id: user.id,
                amount: amountNum,
                status: 'pending',
                bank_account_number: bankAccountNumber,
                bank_ifsc: bankIfsc,
                bank_account_holder: bankHolder,
                bank_name: bankName,
                payout_source: source,
                reference_id: reference_id || null
            })
            .select()
            .single();

        if (prErr) {
            // Rollback based on source
            if (source === 'growth_fund' && reference_id) {
                await admin.from('merchant_lockin_balances').update({ status: 'matured' }).eq('id', reference_id);
            } else {
                const { data: mNew } = await admin.from('merchants').select('wallet_balance_paise').eq('id', merchant.id).single();
                await admin.from('merchants').update({ wallet_balance_paise: (mNew?.wallet_balance_paise || 0) + amountPaise }).eq('id', merchant.id);
            }
            throw prErr;
        }

        // 6. Audit Trail
        if (source === 'wallet') {
            await admin.from('wallet_transactions').insert({
                user_id: user.id,
                merchant_id: merchant.id,
                transaction_type: 'DEBIT',
                amount: amountNum,
                description: `Wallet payout request #${payoutReq.id.slice(0, 8).toUpperCase()} submitted`,
                reference_type: 'payout_request',
                reference_id: payoutReq.id,
            });
        }

        // 8. Notify all admins
        const { data: adminProfiles } = await admin
            .from('user_profiles')
            .select('id')
            .eq('role', 'admin');

        if (adminProfiles && adminProfiles.length > 0) {
            const notifs = adminProfiles.map(ap => ({
                user_id: ap.id,
                title: 'New Payout Request',
                body: `A merchant has requested a withdrawal of ₹${amountNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Review in the Payouts panel.`,
                type: 'info',
                reference_id: payoutReq.id,
                reference_type: 'payout_request',
            }));
            await admin.from('notifications').insert(notifs);
        }

        return NextResponse.json({ success: true, request: payoutReq });
    } catch (error) {
        console.error('[API] Payout POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
