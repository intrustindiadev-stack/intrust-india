/**
 * Canonical AI Orders vault lookup.
 *
 * CONTEXT — the identity note:
 *   ai_orders.merchant_id and ai_orders_vault.merchant_id reference
 *   auth.users(id) (the login user), while merchants.id is a separate
 *   business-entity UUID. Admin surfaces (merchant detail, portfolio) work
 *   with merchants.id; vault APIs work with the auth user id. This helper is
 *   the single choke point that bridges the two, so no caller mixes them up.
 *
 * Resolution:
 *   1. If given a merchants.id (business entity), resolve its user_id first.
 *   2. If given an auth user id directly, use it as-is.
 *
 * Uses the service-role admin client (server-only).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve the auth user id (vault key) for a merchant.
 * Accepts either merchants.id or an auth user id; returns the auth user id
 * (or null when unresolvable).
 */
export async function resolveVaultUserId(admin, { merchantId = null, userId = null }) {
    if (userId && UUID_RE.test(userId)) return userId;

    if (merchantId && UUID_RE.test(merchantId)) {
        const { data } = await admin
            .from('merchants')
            .select('user_id')
            .eq('id', merchantId)
            .maybeSingle();
        if (data?.user_id) return data.user_id;
    }

    return null;
}

/**
 * Fetch the AI Orders vault row for a merchant, accepting either key type.
 * Returns { vault, vaultUserId } — vault is null when no row exists.
 */
export async function getVaultForMerchant(admin, { merchantId = null, userId = null }) {
    const vaultUserId = await resolveVaultUserId(admin, { merchantId, userId });
    if (!vaultUserId) return { vault: null, vaultUserId: null };

    const { data: vault, error } = await admin
        .from('ai_orders_vault')
        .select('*')
        .eq('merchant_id', vaultUserId)
        .maybeSingle();

    if (error) throw error;
    return { vault: vault || null, vaultUserId };
}

/**
 * Fetch an AI order and verify it belongs to the given merchant's vault
 * identity (assignment check). Returns { order, vaultUserId }.
 */
export async function getOrderForMerchant(admin, { orderId, merchantId = null, userId = null }) {
    const vaultUserId = await resolveVaultUserId(admin, { merchantId, userId });
    if (!vaultUserId) return { order: null, vaultUserId: null };

    const { data: order, error } = await admin
        .from('ai_orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error || !order) return { order: null, vaultUserId };
    if (order.merchant_id && order.merchant_id !== vaultUserId) {
        return { order: null, vaultUserId, forbidden: true };
    }
    return { order, vaultUserId };
}
