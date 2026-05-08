import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/shopping/cancel-draft-order
 * Body: { groupId }
 *
 * Called (keepalive) when the SabPaisa payment modal is dismissed without
 * a successful payment, so the pending gateway draft does not linger in
 * shopping_order_groups indefinitely.
 *
 * Guards:
 *  - Auth: must be the customer who owns the group.
 *  - Ownership: customer_id must match userId.
 *  - State: only cancels if payment_method='gateway', payment_status='pending',
 *    status='pending'. Idempotent — silently skips if already finalized.
 */
export async function POST(request) {
    try {
        // 1. Identify User — Bearer-token first, cookie fallback
        let userId = null;

        const authHeader = request.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const tempSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
            const { data: { user } } = await tempSupabase.auth.getUser(token);
            userId = user?.id;
        }

        // Fallback to cookies (read-only to avoid Next.js "cookies().set() not allowed" error)
        if (!userId) {
            const cookieStore = await cookies();
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                {
                    cookies: {
                        get(name) { return cookieStore.get(name)?.value; },
                        set() { },
                        remove() { },
                    },
                }
            );
            const { data: { session } } = await supabase.auth.getSession();
            userId = session?.user?.id;
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: Session missing' }, { status: 401 });
        }

        // 2. Parse and validate body
        const body = await request.json();
        const { groupId } = body;

        if (!groupId || typeof groupId !== 'string' || groupId.length < 32) {
            return NextResponse.json({ error: 'Missing or invalid groupId' }, { status: 400 });
        }

        // 3. Fetch the group row to verify ownership and current state
        const adminSupabase = createAdminClient();

        const { data: group, error: fetchError } = await adminSupabase
            .from('shopping_order_groups')
            .select('id, customer_id, status, payment_status, payment_method')
            .eq('id', groupId)
            .maybeSingle();

        if (fetchError) {
            console.error('[cancel-draft-order] Fetch error:', fetchError);
            return NextResponse.json({ error: 'Database error fetching order group' }, { status: 500 });
        }

        if (!group) {
            // Row not found — treat as already cleaned up
            return NextResponse.json({ success: true, skipped: true }, { status: 200 });
        }

        // Ownership check
        if (group.customer_id !== userId) {
            return NextResponse.json({ error: 'Forbidden: Not your order' }, { status: 403 });
        }

        // Idempotency: if the gateway callback already finalized it, skip silently
        if (
            group.payment_method !== 'gateway' ||
            group.payment_status !== 'pending' ||
            group.status !== 'pending'
        ) {
            console.log(`[cancel-draft-order] Skipped — group ${groupId} already in state status=${group.status}, payment_status=${group.payment_status}`);
            return NextResponse.json({ success: true, skipped: true }, { status: 200 });
        }

        // 4. Guarded UPDATE — compound .eq chain prevents overwriting a concurrently finalized row
        const { error: updateError } = await adminSupabase
            .from('shopping_order_groups')
            .update({ status: 'cancelled', payment_status: 'cancelled' })
            .eq('id', groupId)
            .eq('customer_id', userId)
            .eq('payment_method', 'gateway')
            .eq('payment_status', 'pending')
            .eq('status', 'pending');

        if (updateError) {
            console.error('[cancel-draft-order] Update error:', updateError);
            return NextResponse.json({ error: 'Database error cancelling order group' }, { status: 500 });
        }

        console.log(`[cancel-draft-order] Group ${groupId} cancelled by user ${userId}`);
        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err) {
        console.error('[cancel-draft-order] Critical error:', err);
        return NextResponse.json({
            error: err.message || 'An unexpected server error occurred',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}
