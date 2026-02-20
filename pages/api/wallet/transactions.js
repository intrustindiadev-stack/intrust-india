import { createServerClient } from '@supabase/ssr';
import { WalletService } from '@/lib/wallet/walletService';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            setAll(cookiesToSet) {
                // setAll is not strictly required
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { limit = 10, offset = 0 } = req.query;
        const result = await WalletService.getTransactions(user.id, parseInt(limit), parseInt(offset));
        res.status(200).json(result);
    } catch (error) {
        console.error('Wallet Transactions Error:', error);
        res.status(500).json({ error: error.message });
    }
}
