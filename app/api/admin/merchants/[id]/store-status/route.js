import { createAdminClient } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

/**
 * PATCH /api/admin/merchants/[id]/store-status
 *
 * Admin-only toggle of public.merchants.is_open.
 *
 * WHY THIS ROUTE EXISTS
 *   app/(admin)/admin/store-status/page.jsx previously issued this UPDATE from
 *   the browser with the anon-key client. RLS (`merchants_update_policy`:
 *   user_id = auth.uid()) matches ZERO rows for an admin who does not own the
 *   merchant row, PostgREST returns error = null, and the UI showed
 *   "Store status updated" while nothing changed (a silent no-op that the
 *   realtime channel then reverted). Privileged writes must go through the
 *   service role, per the established pattern in this directory.
 *
 *   `is_open` is NOT a guard-protected column, so no bypass flag is needed.
 *
 * Auth: admin or super_admin (same gate as GET /api/admin/merchants and the
 * sibling routes; platform-wide store control is an operational admin task).
 *
 * Failure semantics:
 *   400  invalid id / invalid payload
 *   401  unauthenticated
 *   403  non-admin caller
 *   404  merchant id does not exist (0 rows updated — reported loudly, never
 *        mistaken for success)
 *   500  unexpected error
 */
export async function PATCH(request, { params }) {
    try {
        const { id: merchantId } = await params;
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!['admin', 'super_admin'].includes(profile?.role)) {
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        if (!merchantId) {
            return NextResponse.json({ error: 'Merchant id is required' }, { status: 400 });
        }

        const body = await request.json().catch(() => null);
        const isOpen = body?.is_open;

        if (typeof isOpen !== 'boolean') {
            return NextResponse.json(
                { error: '"is_open" is required and must be a boolean' },
                { status: 400 }
            );
        }

        // Service role: privileged write that RLS would otherwise block for
        // admins who do not own the merchant row.
        const supabaseAdmin = createAdminClient();

        // Read the previous value first so the audit log can record prev → next.
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('merchants')
            .select('id, business_name, is_open')
            .eq('id', merchantId)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        const { data: updated, error: updateError } = await supabaseAdmin
            .from('merchants')
            .update({ is_open: isOpen })
            .eq('id', merchantId)
            .select('id, business_name, is_open')
            .single();

        if (updateError) {
            console.error('[API] Admin store-status update error:', updateError);
            return NextResponse.json(
                { error: updateError.message || 'Failed to update store status' },
                { status: 500 }
            );
        }

        if (!updated) {
            // Defensive: .single() with .select() should 404 above, but if
            // PostgREST ever returns an empty payload we must NOT report
            // success (that was the original bug).
            return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
        }

        // Audit log — non-blocking, matching sibling routes.
        try {
            await supabaseAdmin.from('audit_logs').insert([{
                admin_id: user.id,
                action: 'store_status_toggle',
                entity_type: 'merchant',
                entity_id: merchantId,
                description: `Store "${existing.business_name || merchantId}" set to ${isOpen ? 'OPEN' : 'CLOSED'} by admin`,
                metadata: {
                    previous_is_open: existing.is_open,
                    new_is_open: isOpen,
                },
            }]);
        } catch (logErr) {
            console.warn('[API] Failed to write store-status audit log:', logErr?.message);
        }

        return NextResponse.json({
            success: true,
            merchant: updated,
        });
    } catch (err) {
        console.error('[API] Admin store-status PATCH Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
