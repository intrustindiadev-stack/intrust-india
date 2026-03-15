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
     * @param {object} [auditLog] - Optional audit log params for admin adjustments
     * @param {string} [auditLog.adminUserId] - UUID of the admin performing the adjustment
     * @param {string} [auditLog.reason] - Business justification
     * @param {string} [auditLog.idempotencyKey] - UUID for retry safety
     * @param {string} [auditLog.ipAddress] - Admin IP for security audit
     * @param {string} [auditLog.userAgent] - Admin browser user-agent
     */
    async creditWallet(userId, amount, type, description, reference = {}, auditLog = null) {
        const amountPaise = Math.round(Number(amount) * 100);
        if (amountPaise <= 0) throw new Error('Invalid credit amount');

        // For admin adjustments, use atomic Postgres function
        if (auditLog) {
            const { data, error } = await supabaseAdmin.rpc('perform_wallet_adjustment', {
                p_target_user_id: userId,
                p_wallet_type: 'customer',
                p_operation: 'credit',
                p_amount_paise: amountPaise,
                p_admin_user_id: auditLog.adminUserId,
                p_reason: auditLog.reason,
                p_idempotency_key: auditLog.idempotencyKey,
                p_ip_address: auditLog.ipAddress || '0.0.0.0',
                p_user_agent: auditLog.userAgent || '',
            });

            if (error) throw new Error(`Atomic wallet adjustment failed: ${error.message}`);

            if (data.duplicate) {
                return {
                    walletId: null,
                    newBalance: (data.balance_after_paise || 0) / 100,
                    transaction: null,
                    auditLogId: data.audit_log_id,
                    duplicate: true,
                };
            }

            return {
                walletId: null,
                newBalance: (data.balance_after_paise || 0) / 100,
                transaction: { id: data.transaction_id },
                auditLogId: data.audit_log_id,
            };
        }

        // Non-admin path: original multi-step approach
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

        return { walletId: wallet.id, newBalance: balanceAfter / 100, transaction: tx, auditLogId: null };
    },

    /**
     * Debits the wallet (Subtracts money)
     * @param {string} userId - UUID of the user
     * @param {number} amount - Amount in Rupees
     * @param {string} description - Human readable description
     * @param {object} reference - { id, type } for tracking
     * @param {object} [auditLog] - Optional audit log params for admin adjustments
     */
    async debitWallet(userId, amount, description, reference = {}, auditLog = null) {
        const amountPaise = Math.round(Number(amount) * 100);
        if (amountPaise <= 0) throw new Error('Invalid debit amount');

        // For admin adjustments, use atomic Postgres function
        if (auditLog) {
            const { data, error } = await supabaseAdmin.rpc('perform_wallet_adjustment', {
                p_target_user_id: userId,
                p_wallet_type: 'customer',
                p_operation: 'debit',
                p_amount_paise: amountPaise,
                p_admin_user_id: auditLog.adminUserId,
                p_reason: auditLog.reason,
                p_idempotency_key: auditLog.idempotencyKey,
                p_ip_address: auditLog.ipAddress || '0.0.0.0',
                p_user_agent: auditLog.userAgent || '',
            });

            if (error) throw new Error(`Atomic wallet adjustment failed: ${error.message}`);

            if (data.duplicate) {
                return {
                    walletId: null,
                    newBalance: (data.balance_after_paise || 0) / 100,
                    transaction: null,
                    auditLogId: data.audit_log_id,
                    duplicate: true,
                };
            }

            return {
                walletId: null,
                newBalance: (data.balance_after_paise || 0) / 100,
                transaction: { id: data.transaction_id },
                auditLogId: data.audit_log_id,
            };
        }

        // Non-admin path: original multi-step approach
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

        if (txError) {
            console.error('[CustomerWalletService] TX Insert Error:', txError);
            throw txError;
        }

        return { walletId: wallet.id, newBalance: balanceAfter / 100, transaction: tx, auditLogId: null };
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
