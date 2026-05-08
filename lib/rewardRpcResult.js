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

export function logRewardRpcResult(context, data) {
    const result = normalizeRewardRpcResult(data);

    if (!result.success || result.totalDistributed === 0) {
        console.warn('[RewardRPC] No rewards applied', {
            ...context,
            success: result.success,
            total_distributed: result.totalDistributed,
            message: result.message,
        });
        return result;
    }

    console.log('[RewardRPC] Rewards applied', {
        ...context,
        total_distributed: result.totalDistributed,
    });

    return result;
}
