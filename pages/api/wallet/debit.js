import { createServerClient } from '@supabase/ssr';
import { WalletService } from '@/lib/wallet/walletService';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            setAll(cookiesToSet) {
                // setAll is not strictly required for read-only/simple endpoints
            },
        }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { amount, referenceId, referenceType, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const transaction = await WalletService.debitWallet(
            user.id,
            amount,
            referenceId,
            referenceType,
            description
        );

        res.status(200).json({ success: true, transaction });
    } catch (error) {
        console.error('Wallet Debit Error:', error);
        res.status(400).json({ error: error.message }); // 400 for business logic errors like insufficient funds
    }
}
