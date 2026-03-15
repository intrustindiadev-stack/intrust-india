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

    async creditWallet(userId, amount, referenceId, referenceType, description, auditLog = null) {
        // amount is in rupees; wallet_balance_paise is in paise
        const amountPaise = Math.round(Number(amount) * 100);

        // For admin adjustments, use atomic Postgres function
        if (auditLog) {
            const { data, error } = await supabaseAdmin.rpc('perform_wallet_adjustment', {
                p_target_user_id: userId,
                p_wallet_type: 'merchant',
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
                    data: null,
                    auditLogId: data.audit_log_id,
                    newBalancePaise: data.balance_after_paise || 0,
                    duplicate: true,
                };
            }

            console.log(`[WalletService] Atomically credited \u20B9${amount} (${amountPaise} paise) to user ${userId}. New balance: \u20B9${(data.balance_after_paise || 0) / 100}`);
            return {
                data: { id: data.transaction_id },
                auditLogId: data.audit_log_id,
                newBalancePaise: data.balance_after_paise || 0,
            };
        }

        // Non-admin path: original multi-step approach
        // 1. Get current merchant balance
        const { data: merchant, error: merchantFetchError } = await supabaseAdmin
            .from('merchants')
            .select('id, wallet_balance_paise')
            .eq('user_id', userId)
            .single();

        if (merchantFetchError) throw merchantFetchError;

        const balanceBeforePaise = merchant.wallet_balance_paise || 0;
        const newBalancePaise = balanceBeforePaise + amountPaise;

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
                balance_before: balanceBeforePaise / 100,
                balance_after: newBalancePaise / 100,
                reference_id: referenceId,
                reference_type: referenceType,
                description: description,
                status: 'COMPLETED'
            })
            .select()
            .single();

        if (txError) {
            console.error('[WalletService] wallet_transactions insert failed:', txError);
        }

        console.log(`[WalletService] Credited \u20B9${amount} (${amountPaise} paise) to user ${userId}. New balance: \u20B9${newBalancePaise / 100}`);
        return { data, auditLogId: null, newBalancePaise };
    },


    async debitWallet(userId, amount, referenceId, referenceType, description, auditLog = null) {
        // amount is in rupees; wallet_balance_paise is in paise
        const amountPaise = Math.round(Number(amount) * 100);

        // For admin adjustments, use atomic Postgres function
        if (auditLog) {
            const { data, error } = await supabaseAdmin.rpc('perform_wallet_adjustment', {
                p_target_user_id: userId,
                p_wallet_type: 'merchant',
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
                    data: null,
                    auditLogId: data.audit_log_id,
                    newBalancePaise: data.balance_after_paise || 0,
                    duplicate: true,
                };
            }

            console.log(`[WalletService] Atomically debited \u20B9${amount} (${amountPaise} paise) from user ${userId}. New balance: \u20B9${(data.balance_after_paise || 0) / 100}`);
            return {
                data: { id: data.transaction_id },
                auditLogId: data.audit_log_id,
                newBalancePaise: data.balance_after_paise || 0,
            };
        }

        // Non-admin path: original multi-step approach
        // 1. Get current merchant record
        const { data: merchant, error: merchantFetchError } = await supabaseAdmin
            .from('merchants')
            .select('id, wallet_balance_paise')
            .eq('user_id', userId)
            .single();

        if (merchantFetchError) throw merchantFetchError;

        const currentBalancePaise = merchant.wallet_balance_paise || 0;

        if (currentBalancePaise < amountPaise) {
            throw new Error('Insufficient wallet balance');
        }

        const newBalancePaise = currentBalancePaise - amountPaise;

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
                transaction_type: 'DEBIT',
                amount: amount,
                balance_before: currentBalancePaise / 100,
                balance_after: newBalancePaise / 100,
                reference_id: referenceId,
                reference_type: referenceType,
                description: description,
                status: 'COMPLETED'
            })
            .select()
            .single();

        if (txError) {
            console.error('[WalletService] wallet_transactions insert failed:', txError);
        }

        console.log(`[WalletService] Debited \u20B9${amount} (${amountPaise} paise) from user ${userId}. New balance: \u20B9${newBalancePaise / 100}`);
        return { data, auditLogId: null, newBalancePaise };
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
