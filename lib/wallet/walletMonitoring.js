import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * WalletMonitoring provides functions for security monitoring,
 * suspicious activity detection, and compliance reporting.
 */
export const WalletMonitoring = {
    /**
     * Flag suspicious activity: admin made >5 adjustments in 1 hour.
     * Returns true if suspicious.
     * @param {string} adminUserId
     * @returns {{ suspicious: boolean, count: number }}
     */
    async flagSuspiciousActivity(adminUserId) {
        const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();

        const { count, error } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select('id', { count: 'exact', head: true })
            .eq('admin_user_id', adminUserId)
            .gte('created_at', oneHourAgo);

        if (error) {
            console.error('[WalletMonitoring] flagSuspiciousActivity error:', error);
            return { suspicious: false, count: 0 };
        }

        const isSuspicious = (count || 0) > 5;

        if (isSuspicious) {
            console.warn(
                `[WalletMonitoring] SUSPICIOUS: Admin ${adminUserId} made ${count} adjustments in the last hour.`
            );
        }

        return { suspicious: isSuspicious, count: count || 0 };
    },

    /**
     * Get daily adjustment summary for compliance reporting.
     * @returns {{ totalAdjustments: number, totalCreditPaise: number, totalDebitPaise: number, uniqueAdmins: number }}
     */
    async getDailyAdjustmentSummary() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data, error } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select('operation, amount_paise, admin_user_id')
            .eq('status', 'completed')
            .gte('created_at', startOfDay.toISOString());

        if (error) {
            console.error('[WalletMonitoring] getDailyAdjustmentSummary error:', error);
            return { totalAdjustments: 0, totalCreditPaise: 0, totalDebitPaise: 0, uniqueAdmins: 0 };
        }

        const logs = data || [];
        const adminSet = new Set(logs.map(l => l.admin_user_id));

        return {
            totalAdjustments: logs.length,
            totalCreditPaise: logs
                .filter(l => l.operation === 'credit')
                .reduce((sum, l) => sum + (l.amount_paise || 0), 0),
            totalDebitPaise: logs
                .filter(l => l.operation === 'debit')
                .reduce((sum, l) => sum + (l.amount_paise || 0), 0),
            uniqueAdmins: adminSet.size,
        };
    },

    /**
     * Get all failed adjustments (for ops team review).
     * @param {number} limit
     * @returns {object[]}
     */
    async getFailedAdjustments(limit = 50) {
        const { data, error } = await supabaseAdmin
            .from('wallet_adjustment_logs')
            .select(`
                *,
                admin:fk_admin_user_profile(full_name, email),
                target:fk_target_user_profile(full_name, email)
            `)
            .eq('status', 'failed')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[WalletMonitoring] getFailedAdjustments error:', error);
            return [];
        }

        return data || [];
    },
};
