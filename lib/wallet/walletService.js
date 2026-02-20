import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const WalletService = {
    async createWallet(userId) {
        const { data, error } = await supabaseAdmin
            .from('merchant_wallets')
            .upsert({ user_id: userId, balance: 0.00, status: 'ACTIVE' }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getBalance(userId) {
        let { data, error } = await supabaseAdmin
            .from('merchant_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Wallet doesn't exist, create it
            return await this.createWallet(userId);
        }

        if (error) throw error;
        return data;
    },

    async creditWallet(userId, amount, referenceId, referenceType, description) {
        // amount is in rupees; wallet_balance_paise is in paise
        const amountPaise = Math.round(Number(amount) * 100);

        // 1. Get current merchant balance
        const { data: merchant, error: merchantFetchError } = await supabaseAdmin
            .from('merchants')
            .select('id, wallet_balance_paise')
            .eq('user_id', userId)
            .single();

        if (merchantFetchError) throw merchantFetchError;

        const newBalancePaise = (merchant.wallet_balance_paise || 0) + amountPaise;

        // 2. Update merchant wallet balance
        const { error: updateError } = await supabaseAdmin
            .from('merchants')
            .update({
                wallet_balance_paise: newBalancePaise,
                updated_at: new Date()
            })
            .eq('id', merchant.id);

        if (updateError) throw updateError;

        // 3. Insert wallet_transactions record for history
        const { data, error: txError } = await supabaseAdmin
            .from('wallet_transactions')
            .insert({
                user_id: userId,
                transaction_type: 'CREDIT',
                amount: amount,
                balance_before: (merchant.wallet_balance_paise || 0) / 100,
                balance_after: newBalancePaise / 100,
                reference_id: referenceId,
                reference_type: referenceType,
                description: description,
                status: 'COMPLETED'
            })
            .select()
            .single();

        if (txError) {
            // Non-fatal: balance was already updated, just log the history failure
            console.error('[WalletService] wallet_transactions insert failed:', txError);
        }

        console.log(`[WalletService] Credited ₹${amount} (${amountPaise} paise) to user ${userId}. New balance: ₹${newBalancePaise / 100}`);
        return data;
    },


    async debitWallet(userId, amount, referenceId, referenceType, description) {
        const wallet = await this.getBalance(userId);

        if (wallet.balance < amount) {
            throw new Error('Insufficient wallet balance');
        }

        const { data, error } = await supabaseAdmin
            .from('wallet_transactions')
            .insert({
                wallet_id: wallet.id,
                user_id: userId,
                transaction_type: 'DEBIT',
                amount: amount,
                balance_before: wallet.balance,
                balance_after: Number(wallet.balance) - Number(amount),
                reference_id: referenceId,
                reference_type: referenceType,
                description: description,
                status: 'COMPLETED'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getTransactions(userId, limit = 10, offset = 0) {
        const { data, error, count } = await supabaseAdmin
            .from('wallet_transactions')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { transactions: data, total: count };
    }
};
