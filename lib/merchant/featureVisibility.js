import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Server-side helper: resolves the super-admin feature-visibility flags for a
 * merchant user (columns on public.merchants, managed via
 * PATCH /api/admin/merchants/[id]/visibility — super_admin only).
 *
 * Flags default to TRUE (visible) when the merchant row is missing or the
 * column is null, so existing merchants are never accidentally locked out.
 *
 * @param {string} userId - auth.users.id (merchants.user_id)
 * @returns {Promise<{merchantId: string|null, showLockin: boolean, showAiGrow: boolean, showAiOrders: boolean}>}
 */
export async function getMerchantFeatureVisibility(userId) {
    const admin = createAdminClient();
    const { data } = await admin
        .from('merchants')
        .select('id, show_lockin, show_ai_grow, show_ai_orders')
        .eq('user_id', userId)
        .maybeSingle();

    return {
        merchantId: data?.id || null,
        showLockin: data ? data.show_lockin !== false : true,
        showAiGrow: data ? data.show_ai_grow !== false : true,
        showAiOrders: data ? data.show_ai_orders !== false : true,
    };
}
