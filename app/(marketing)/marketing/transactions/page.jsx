import { createServerSupabaseClient } from '@/lib/supabaseServer';
import TransactionsClient from './TransactionsClient';

export default async function MarketingTransactionsPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch user profile & merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    let transactions = [];
    if (isMerchant) {
        const { data: merchant } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (merchant?.id) {
            const { data } = await supabase
                .from('merchant_transactions')
                .select('*')
                .eq('merchant_id', merchant.id)
                .order('created_at', { ascending: false })
                .limit(50);
            transactions = data || [];
        }
    } else {
        const { data } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        transactions = data || [];
    }

    return (
        <TransactionsClient
            user={user}
            isMerchant={isMerchant}
            initialTransactions={transactions}
        />
    );
}
