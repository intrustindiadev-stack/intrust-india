import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                cookies: {
                    get(name) {
                        return cookieStore.get(name)?.value;
                    },
                },
            }
        );

        const supabaseAuth = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
                cookies: { get(name) { return cookieStore.get(name)?.value; } }
            }
        );

        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get Merchant Profile
        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (!merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // To support proper pagination across merged tables, we fetch a larger buffer
        // for each source and then merge, sort, and slice.
        const fetchLimit = page * limit;

        // 2. Fetch Sabpaisa Wallet Top-up transactions
        const { data: walletTxs } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(fetchLimit);

        // 3. Fetch Merchant Coupon transactions
        const { data: merchantTxs } = await supabase
            .from('merchant_transactions')
            .select('*')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(fetchLimit);

        // 4. Fetch Payout / Withdrawal requests
        const { data: payoutTxs } = await supabase
            .from('payout_requests')
            .select('id, amount, status, requested_at')
            .eq('user_id', user.id)
            .order('requested_at', { ascending: false })
            .limit(fetchLimit);

        // 5. Normalization Logic
        const normalizedWalletTxs = (walletTxs || []).map(tx => ({
            id: tx.id,
            source: 'wallet',
            transaction_type: tx.transaction_type || 'CREDIT',
            description: tx.description || tx.reference_type || 'Wallet Topup',
            amount: Number(tx.amount || 0).toFixed(2),
            created_at: tx.created_at,
            reference_type: tx.reference_type,
        }));

        const normalizedMerchantTxs = (merchantTxs || []).map(tx => {
            let txType = (tx.amount_paise || 0) < 0 ? 'DEBIT' : 'CREDIT';
            if (tx.transaction_type === 'payout') {
                txType = 'SETTLEMENT';
            }
            const desc = tx.description || tx.transaction_type || 'Transaction';
            const amountVal = Math.abs(tx.amount_paise || 0) / 100;

            return {
                id: tx.id,
                source: 'merchant',
                transaction_type: txType,
                description: desc,
                amount: amountVal.toFixed(2),
                created_at: tx.created_at,
            };
        });

        const statusLabel = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected (Refunded)', released: 'Released' };
        const normalizedPayoutTxs = (payoutTxs || []).map(tx => {
            const isCredit = tx.status === 'rejected' || tx.status === 'refunded';
            return {
                id: `${tx.id}`,
                source: 'payout',
                transaction_type: isCredit ? 'CREDIT' : 'DEBIT',
                description: `Withdrawal Request — ${statusLabel[tx.status] || tx.status}`,
                amount: Number(tx.amount || 0).toFixed(2),
                created_at: tx.requested_at,
            };
        });

        // 6. Merge and Filter duplicates (prefer payout_requests over wallet_transactions for withdrawals)
        const filteredWalletTxs = normalizedWalletTxs.filter(
            tx => tx.reference_type !== 'payout_request'
        );

        // 7. Sort and Slice for the current page
        const allTransactions = [...filteredWalletTxs, ...normalizedMerchantTxs, ...normalizedPayoutTxs]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(offset, offset + limit);

        return NextResponse.json({
            transactions: allTransactions,
            page,
            limit
        });

    } catch (error) {
        console.error('[API] Wallet History Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
