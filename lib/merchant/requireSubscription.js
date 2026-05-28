import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

/**
 * Server-side subscription guard for API route handlers.
 *
 * Usage:
 *   const result = await requireMerchantSubscription(request);
 *   if (!result.ok) return result.response;
 *   const { user, merchant, admin } = result;
 *
 * Admins (role = admin | super_admin) bypass the subscription check.
 *
 * Note on RLS: The `merchants_update_policy` on the `merchants` table only
 * checks `user_id = auth.uid()` with no subscription guard. Profile writes
 * from the client (profile/page.jsx, Business Info tab) are safe as-is
 * because they update non-operational fields. This helper is used for
 * operational API endpoints that should require an active subscription.
 */
export async function requireMerchantSubscription(request) {
    const { user, profile, admin } = await getAuthUser(request);

    if (!user) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        };
    }

    // Fetch merchant row
    const { data: merchant, error: merchantError } = await admin
        .from('merchants')
        .select('id, status, subscription_status, subscription_expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

    if (merchantError || !merchant) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Merchant not found' }, { status: 404 }),
        };
    }

    // Admins bypass subscription check
    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

    // Compute active subscription
    const now = new Date();
    const isSubscribed =
        merchant.subscription_status === 'active' &&
        merchant.subscription_expires_at &&
        new Date(merchant.subscription_expires_at) > now;

    if (!isSubscribed && !isAdmin) {
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Subscription required' },
                { status: 402 }
            ),
        };
    }

    return { ok: true, user, merchant, admin, profile };
}
