import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/investments/[id]/settle
 *
 * Unified, atomic settlement endpoint for AI Grow investments.
 * Handles both:
 *   - destination = 'wallet' (Principal + Profit credited to merchant's digital wallet)
 *   - destination = 'offline_cash' (Marked paid offline; merchant digital wallet untouched)
 *
 * All operations executed atomically via public.settle_ai_grow_investment RPC.
 */
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin: supabase } = await getAuthUser(request);

        if (!user || profile?.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Access denied. Super admin role required to settle growth plans.' },
                { status: 403 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const destination = body.destination || 'wallet';
        const idempotencyKey = body.idempotencyKey || null;
        const notes = body.notes || null;

        if (!['wallet', 'offline_cash'].includes(destination)) {
            return NextResponse.json(
                { error: 'Invalid settlement destination. Must be "wallet" or "offline_cash".' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase.rpc('settle_ai_grow_investment', {
            p_investment_id: id,
            p_admin_id: user.id,
            p_settlement_destination: destination,
            p_idempotency_key: idempotencyKey,
            p_notes: notes,
        });

        if (error) {
            console.error('[settle_ai_grow_investment RPC error]:', error);
            return NextResponse.json(
                { error: error.message || 'Settlement failed.' },
                { status: 400 }
            );
        }

        if (data && data.success === false) {
            return NextResponse.json(
                { error: data.error || 'Settlement rejected.', data },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data
        });

    } catch (err) {
        console.error('[settle investment] Internal error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
    }
}
