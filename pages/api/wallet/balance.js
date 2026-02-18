import { createClient } from '@supabase/supabase-js';

async function getUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        console.error('[Wallet Balance] Auth error:', error);
        return null;
    }
    return user;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Initialize admin client inside handler to ensure env vars are available
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('[Wallet Balance] Service role key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized - Please log in' });
        }

        console.log('[Wallet Balance] Fetching for user:', user.id);

        // Get user role to handle admin case
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const isAdmin = profile?.role === 'admin';

        // Get merchant record
        // For admins: try own merchant first, then fall back to most recent
        let merchant = null;

        if (isAdmin) {
            // Try to get admin's own merchant first
            const { data: ownMerchant } = await supabaseAdmin
                .from('merchants')
                .select('id, wallet_balance_paise')
                .eq('user_id', user.id)
                .single();

            if (ownMerchant) {
                merchant = ownMerchant;
            } else {
                // Fallback: most recent merchant
                const { data: recentMerchant } = await supabaseAdmin
                    .from('merchants')
                    .select('id, wallet_balance_paise')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                merchant = recentMerchant;
            }
        } else {
            const { data, error: merchantError } = await supabaseAdmin
                .from('merchants')
                .select('id, wallet_balance_paise')
                .eq('user_id', user.id)
                .single();

            if (merchantError) {
                console.error('[Wallet Balance] Merchant fetch error:', merchantError);
                throw new Error('Merchant account not found');
            }
            merchant = data;
        }

        if (!merchant) {
            throw new Error('Merchant account not found');
        }

        console.log('[Wallet Balance] Merchant found:', merchant.id);

        const balanceRupees = (merchant.wallet_balance_paise || 0) / 100;

        // Fetch wallet top-up transactions (wallet_transactions table)
        const { data: walletTxs, error: walletTxError } = await supabaseAdmin
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (walletTxError) {
            console.error('[Wallet Balance] Wallet transactions fetch error:', walletTxError);
        }
        console.log('[Wallet Balance] Wallet txs:', walletTxs?.length ?? 0);

        // Fetch merchant purchase/sale transactions (merchant_transactions table)
        const { data: merchantTxs, error: merchantTxError } = await supabaseAdmin
            .from('merchant_transactions')
            .select('*')
            .eq('merchant_id', merchant.id)
            .order('created_at', { ascending: false })
            .limit(50);

        console.log('[Wallet Balance] Merchant txs:', merchantTxs?.length ?? 0, '| Error:', merchantTxError?.message);

        if (merchantTxError) {
            console.error('[Wallet Balance] Merchant transactions fetch error:', merchantTxError);
        }

        // Normalize wallet_transactions to a common format
        const normalizedWalletTxs = (walletTxs || []).map(tx => ({
            id: tx.id,
            transaction_type: tx.transaction_type || 'CREDIT',
            description: tx.description || tx.reference_type || 'Wallet Topup',
            amount: tx.amount,
            created_at: tx.created_at,
            source: 'wallet',
        }));

        // Normalize merchant_transactions to a common format
        const normalizedMerchantTxs = (merchantTxs || []).map(tx => ({
            id: tx.id,
            // amount_paise is negative for purchases, positive for sales
            transaction_type: (tx.amount_paise || 0) < 0 ? 'DEBIT' : 'CREDIT',
            description: tx.description || tx.transaction_type || 'Transaction',
            // Convert paise to rupees
            amount: Math.abs(tx.amount_paise || 0) / 100,
            created_at: tx.created_at,
            source: 'merchant',
        }));

        // Merge and sort by date descending
        const allTransactions = [...normalizedWalletTxs, ...normalizedMerchantTxs]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 50);

        console.log('[Wallet Balance] Total transactions returned:', allTransactions.length);

        return res.status(200).json({
            wallet: {
                balance: balanceRupees,
                balance_paise: merchant.wallet_balance_paise || 0,
                merchant_id: merchant.id
            },
            transactions: allTransactions
        });
    } catch (error) {
        console.error('[Wallet Balance] Error:', error);
        return res.status(500).json({
            error: error.message || 'Failed to get wallet balance',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
