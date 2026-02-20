import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const cookieStore = await cookies();

        // Initialize admin client inside handler to ensure env vars are available for secure cross-table fetches
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

        // Fetch User using Anon Key for safety, rely on Service Role for queries
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

        // 1. Get Merchant Profile & Balance
        // For admins: try own merchant first, then fall back to most recent
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        let merchant = null;

        if (profile?.role === 'admin') {
            const { data: ownMerchant } = await supabase.from('merchants').select('id, wallet_balance_paise').eq('user_id', user.id).single();
            merchant = ownMerchant || (await supabase.from('merchants').select('id, wallet_balance_paise').order('created_at', { ascending: false }).limit(1).single()).data;
        } else {
            const { data } = await supabase.from('merchants').select('id, wallet_balance_paise').eq('user_id', user.id).single();
            merchant = data;
        }

        if (!merchant) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // 2. Fetch Sabpaisa Wallet Top-up transactions
        const { data: walletTxs } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        // 3. Fetch Merchant Coupon transactions
        const { data: merchantTxs } = await supabase
            .from('merchant_transactions')
            .select('*')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(50);

        // 4. Normalize and Merge
        const normalizedWalletTxs = (walletTxs || []).map(tx => ({
            id: tx.id,
            transaction_type: tx.transaction_type || 'CREDIT',
            description: tx.description || tx.reference_type || 'Wallet Topup',
            amount: JSON.stringify(tx.amount || 0), // Already in Rupees from SabPaisa
            created_at: tx.created_at,
        }));

        const normalizedMerchantTxs = (merchantTxs || []).map(tx => ({
            id: tx.id,
            transaction_type: (tx.amount_paise || 0) < 0 ? 'DEBIT' : 'CREDIT',
            description: tx.description || tx.transaction_type || 'Transaction',
            amount: (Math.abs(tx.amount_paise || 0) / 100).toFixed(2), // Convert from Paise
            created_at: tx.created_at,
        }));

        // Sort by date descending
        const allTransactions = [...normalizedWalletTxs, ...normalizedMerchantTxs]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 50);

        const balanceRupees = merchant.wallet_balance_paise ? (merchant.wallet_balance_paise / 100).toFixed(2) : "0.00";

        return NextResponse.json({
            wallet: {
                balance: balanceRupees,
                balance_paise: merchant.wallet_balance_paise || 0,
                merchant_id: merchant.id
            },
            transactions: allTransactions
        });

    } catch (error) {
        console.error('[API] Wallet Balance Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
