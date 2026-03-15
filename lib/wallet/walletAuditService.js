import { createAdminClient } from '@/lib/supabaseServer';

/**
 * WalletAuditService handles audit logging, idempotency checks, and
 * compliance reporting for admin wallet adjustments.
 */
export const WalletAuditService = {
    /**
     * Check if an adjustment with this idempotency key was already processed.
     * @param {string} idempotencyKey - UUID idempotency key
     * @returns {object|null} - Existing log entry if found, null otherwise
     */
    async checkIdempotency(idempotencyKey) {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .maybeSingle();

        if (error) {
            console.error('[WalletAuditService] Idempotency check error:', error);
            throw error;
        }

        return data; // null if not found
    },

    /**
     * Log a wallet adjustment (insert into audit trail).
     * @param {object} params
     * @param {string} params.adminUserId
     * @param {string} params.targetUserId
     * @param {'customer'|'merchant'} params.walletType
     * @param {'credit'|'debit'} params.operation
     * @param {number} params.amountPaise - Always positive
     * @param {number} params.balanceBeforePaise
     * @param {number} params.balanceAfterPaise
     * @param {string} params.reason
     * @param {string} params.idempotencyKey
     * @param {'pending'|'completed'|'failed'} params.status
     * @param {string|null} params.errorMessage
     * @param {string|null} params.ipAddress
     * @param {string|null} params.userAgent
     * @returns {object} - The created audit log entry
     */
    async logAdjustment({
        adminUserId,
        targetUserId,
        walletType,
        operation,
        amountPaise,
        balanceBeforePaise,
        balanceAfterPaise,
        reason,
        idempotencyKey,
        status,
        errorMessage = null,
        ipAddress = null,
        userAgent = null,
    }) {
        const logEntry = {
            admin_user_id: adminUserId,
            target_user_id: targetUserId,
            wallet_type: walletType,
            operation,
            amount_paise: amountPaise,
            balance_before_paise: balanceBeforePaise,
            balance_after_paise: balanceAfterPaise,
            reason,
            idempotency_key: idempotencyKey,
            status,
            error_message: errorMessage,
            ip_address: ipAddress,
            user_agent: userAgent,
            completed_at: status === 'completed' ? new Date().toISOString() : null,
        };

        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .insert(logEntry)
            .select()
            .single();

        if (error) {
            console.error('[WalletAuditService] Failed to insert audit log:', error);
            throw error;
        }

        return data;
    },

    /**
     * Get adjustment history for a specific user.
     * @param {string} userId
     * @param {number} limit
     * @param {number} offset
     * @returns {{ logs: object[], total: number }}
     */
    async getAdjustmentHistory(userId, limit = 20, offset = 0) {
        const supabaseAdmin = createAdminClient();
        const { data, error, count } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select('*, admin:fk_admin_user_profile(full_name, email)', { count: 'exact' })
            .eq('target_user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { logs: data || [], total: count || 0 };
    },

    /**
     * Get all adjustments made by a specific admin.
     * @param {string} adminUserId
     * @param {number} limit
     * @param {number} offset
     * @returns {{ logs: object[], total: number }}
     */
    async getAdminAuditTrail(adminUserId, limit = 20, offset = 0) {
        const supabaseAdmin = createAdminClient();
        const { data, error, count } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select('*, target:fk_target_user_profile(full_name, email)', { count: 'exact' })
            .eq('admin_user_id', adminUserId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { logs: data || [], total: count || 0 };
    },

    /**
     * Get all wallet adjustment logs with filters.
     * @param {object} filters
     * @param {string} [filters.status]
     * @param {string} [filters.walletType]
     * @param {string} [filters.adminUserId]
     * @param {string} [filters.dateFrom]
     * @param {string} [filters.dateTo]
     * @param {string} [filters.search]
     * @param {number} limit
     * @param {number} offset
     * @returns {{ logs: object[], total: number }}
     */
    async getAllAdjustments(filters = {}, limit = 50, offset = 0) {
        const supabaseAdmin = createAdminClient();
        let query = supabaseAdmin
            .from('wallet_adjustment_logs')
            .select(`
                *,
                admin:fk_admin_user_profile(full_name, email),
                target:fk_target_user_profile(full_name, email)
            `, { count: 'exact' });

        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.walletType) {
            query = query.eq('wallet_type', filters.walletType);
        }
        if (filters.adminUserId) {
            query = query.eq('admin_user_id', filters.adminUserId);
        }
        if (filters.dateFrom) {
            query = query.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.lte('created_at', filters.dateTo);
        }
        if (filters.search) {
            query = query.or(`reason.ilike.%${filters.search}%,target_user_id.eq.${filters.search}`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { logs: data || [], total: count || 0 };
    },

    /**
     * Check daily adjustment total for a specific admin.
     * @param {string} adminUserId
     * @returns {number} - Total adjustments made today in paise
     */
    async getAdminDailyTotal(adminUserId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select('amount_paise')
            .eq('admin_user_id', adminUserId)
            .eq('status', 'completed')
            .gte('created_at', startOfDay.toISOString());

        if (error) throw error;

        return (data || []).reduce((sum, log) => sum + (log.amount_paise || 0), 0);
    },

    /**
     * Check admin's adjustment count in the last minute (rate limiting).
     * @param {string} adminUserId
     * @returns {number}
     */
    async getAdminRecentCount(adminUserId) {
        const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();

        const supabaseAdmin = createAdminClient();
        const { count, error } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select('id', { count: 'exact', head: true })
            .eq('admin_user_id', adminUserId)
            .gte('created_at', oneMinuteAgo);

        if (error) throw error;
        return count || 0;
    },

    /**
     * Get admin permissions for a user.
     * @param {string} adminUserId
     * @returns {string[]} - List of permission strings
     */
    async getAdminPermissions(adminUserId) {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin
            .from('admin_permissions')
            .select('permission')
            .eq('admin_user_id', adminUserId);

        if (error) {
            console.error('[WalletAuditService] Permission fetch error DETAILED:', JSON.stringify(error, null, 2));
            throw new Error(`Failed to fetch admin permissions: ${error.message}`);
        }

        return (data || []).map(p => p.permission);
    },
};
