import { createAdminClient } from '@/lib/supabaseServer';

/**
 * Server-side helper: resolves the super-admin feature-visibility flags for a
 * merchant user (columns on public.merchants, managed via
 * PATCH /api/admin/merchants/[id]/visibility — super_admin only).
 *
 * Flags default to FALSE (hidden) when the merchant row is missing or the
 * column is null/false, so investment features remain hidden until explicitly
 * enabled by a super admin.
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
        showLockin: Boolean(data?.show_lockin),
        showAiGrow: Boolean(data?.show_ai_grow),
        showAiOrders: Boolean(data?.show_ai_orders),
    };
}
