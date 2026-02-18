import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized - Please log in' });
        }

        console.log('[Wallet Balance] Fetching for user:', user.id);

        // Get merchant record (balance stored in wallet_balance_paise)
        const { data: merchant, error: merchantError } = await supabaseAdmin
            .from('merchants')
            .select('id, wallet_balance_paise')
            .eq('user_id', user.id)
            .single();

        if (merchantError) {
            console.error('[Wallet Balance] Merchant fetch error:', merchantError);
            throw new Error('Merchant account not found');
        }

        const balanceRupees = (merchant.wallet_balance_paise || 0) / 100;

        // Service role bypasses RLS (FORCE RLS is off) — query by user_id
        const { data: transactions, error: txError } = await supabaseAdmin
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (txError) {
            console.error('[Wallet Balance] Transactions fetch error:', txError);
        }

        console.log('[Wallet Balance] Balance (paise):', merchant.wallet_balance_paise, '| Transactions:', transactions?.length ?? 0);

        return res.status(200).json({
            wallet: {
                balance: balanceRupees,
                balance_paise: merchant.wallet_balance_paise || 0,
                merchant_id: merchant.id
            },
            transactions: transactions || []
        });
    } catch (error) {
        console.error('[Wallet Balance] Error:', error);
        return res.status(500).json({
            error: error.message || 'Failed to get wallet balance',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}

