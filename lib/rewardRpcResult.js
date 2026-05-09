import { createAdminClient } from '@/lib/supabaseServer';

export function normalizeRewardRpcResult(data) {
    const payload = Array.isArray(data) ? data[0] : data;
    const success = payload?.success !== false;
    const totalDistributed = Number(payload?.total_distributed ?? 0);

    return {
        payload,
        success,
        totalDistributed: Number.isFinite(totalDistributed) ? totalDistributed : 0,
        message: payload?.message || null,
    };
}

async function insertLog(data) {
    try {
        const supabase = createAdminClient();
        const { error } = await supabase.from('reward_distribution_log').insert([data]);
        if (error) console.error('[RewardRPC] Failed to insert log:', error);
    } catch (e) {
        console.error('[RewardRPC] Exception inserting log:', e);
    }
}

export function logRewardRpcResult(context, data, extras = {}) {
    const result = normalizeRewardRpcResult(data);

    if (!result.success || result.totalDistributed === 0) {
        console.warn('[RewardRPC] No rewards applied', {
            ...context,
            success: result.success,
            total_distributed: result.totalDistributed,
            message: result.message,
        });
    } else {
        console.log('[RewardRPC] Rewards applied', {
            ...context,
            total_distributed: result.totalDistributed,
        });
    }

    void insertLog({
        event_type: context.event_type,
        source_user_id: context.source_user_id,
        reference_id: context.reference_id || null,
        reference_type: context.reference_type || null,
        amount_paise: extras.amountPaise || null,
        success: result.success,
        total_distributed: result.totalDistributed,
        error_message: result.message || null,
        correlation_id: extras.correlationId || context.correlationId || null,
    });

    return result;
}

export function logRewardRpcFailure(context, error, extras = {}) {
    console.error('[RewardRPC] RPC Failure', {
        ...context,
        error: error?.message || error,
    });

    void insertLog({
        event_type: context.event_type,
        source_user_id: context.source_user_id,
        reference_id: context.reference_id || null,
        reference_type: context.reference_type || null,
        amount_paise: extras.amountPaise || null,
        success: false,
        total_distributed: 0,
        error_message: error?.message || String(error),
        correlation_id: extras.correlationId || context.correlationId || null,
    });
}
