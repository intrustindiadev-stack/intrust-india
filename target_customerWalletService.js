import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * CustomerWalletService handles logic for the user's digital wallet.
 * Uses 'paise' (BIGINT) for all internal calculations to ensure accuracy.
 */
export const CustomerWalletService = {
    /**
     * Ensures a wallet exists for the user and returns it.
     */
    async getOrCreateWallet(userId) {
        // 1. Try to get existing wallet
        let { data, error } = await supabaseAdmin
            .from('customer_wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // 2. Create if not exists
            const { data: newWallet, error: createError } = await supabaseAdmin
                .from('customer_wallets')
                .upsert({ user_id: userId, balance_paise: 0, status: 'ACTIVE' }, { onConflict: 'user_id' })
                .select()
                .single();

            if (createError) throw createError;
            return newWallet;
        }

        if (error) throw error;
        return data;
    },

    /**
     * Credits the wallet (Adds money)
     * @param {string} userId - UUID of the user
     * @param {number} amount - Amount in Rupees (e.g., 199.50)
     * @param {string} type - 'CASHBACK', 'TOPUP', 'REFUND'
     * @param {string} description - Human readable description
     * @param {object} reference - { id, type } for tracking logic (e.g., Order ID)
     */
    async creditWallet(userId, amount, type, description, reference = {}) {
        const amountPaise = Math.round(Number(amount) * 100);
        if (amountPaise <= 0) throw new Error('Invalid credit amount');

        const wallet = await this.getOrCreateWallet(userId);
        const balanceBefore = wallet.balance_paise;
        const balanceAfter = balanceBefore + amountPaise;

        // Update Balance
        const { error: updateError } = await supabaseAdmin
            .from('customer_wallets')
            .update({
                balance_paise: balanceAfter,
                updated_at: new Date()
            })
            .eq('id', wallet.id);

        if (updateError) throw updateError;

        // Record Transaction
        const { data: tx, error: txError } = await supabaseAdmin
            .from('customer_wallet_transactions')
            .insert({
                wallet_id: wallet.id,
                user_id: userId,
                type: type,
                amount_paise: amountPaise,
                balance_before_paise: balanceBefore,
                balance_after_paise: balanceAfter,
                description: description,
                reference_id: reference.id,
                reference_type: reference.type
            })
            .select()
            .single();

        if (txError) {
            console.error('[CustomerWalletService] TX Insert Error:', txError);
            throw txError;
        }

        return { walletId: wallet.id, newBalance: balanceAfter / 100, transaction: tx };
    },

    /**
     * Debits the wallet (Subtracts money)
     */
    async debitWallet(userId, amount, description, reference = {}) {
        const amountPaise = Math.round(Number(amount) * 100);
        if (amountPaise <= 0) throw new Error('Invalid debit amount');

        const wallet = await this.getOrCreateWallet(userId);
        const balanceBefore = wallet.balance_paise;

        if (balanceBefore < amountPaise) {
            throw new Error('Insufficient wallet balance');
        }

        const balanceAfter = balanceBefore - amountPaise;

        // Update Balance
        const { error: updateError } = await supabaseAdmin
            .from('customer_wallets')
            .update({
                balance_paise: balanceAfter,
                updated_at: new Date()
            })
            .eq('id', wallet.id);

        if (updateError) throw updateError;

        // Record Transaction
        const { data: tx, error: txError } = await supabaseAdmin
            .from('customer_wallet_transactions')
            .insert({
                wallet_id: wallet.id,
                user_id: userId,
                type: 'DEBIT',
                amount_paise: amountPaise,
                balance_before_paise: balanceBefore,
                balance_after_paise: balanceAfter,
                description: description,
                reference_id: reference.id,
                reference_type: reference.type
            })
            .select()
            .single();

        return { walletId: wallet.id, newBalance: balanceAfter / 100, transaction: tx };
    },

    async getBalance(userId) {
        const wallet = await this.getOrCreateWallet(userId);
        return wallet.balance_paise / 100;
    },

    async getHistory(userId, limit = 20) {
        const { data, error } = await supabaseAdmin
            .from('customer_wallet_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data.map(tx => ({
            ...tx,
            amount: tx.amount_paise / 100,
            balanceAfter: tx.balance_after_paise / 100
        }));
    }
};
