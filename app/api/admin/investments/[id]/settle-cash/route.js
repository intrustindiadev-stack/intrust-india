import { getAuthUser } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/investments/[id]/settle-cash
 *
 * Mark AI Grow investment as paid offline in cash.
 * Merchant digital wallet remains untouched (0 wallet credit).
 * Uses atomic public.settle_ai_grow_investment RPC.
 */
export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const { user, profile, admin: supabase } = await getAuthUser(request);
        
        if (!user || profile?.role !== 'super_admin') {
            return NextResponse.json(
                { error: 'Access denied. Super admin role required to mark growth plan as paid offline.' },
                { status: 403 }
            );
        }

        const body = await request.json().catch(() => ({}));

        const { data, error } = await supabase.rpc('settle_ai_grow_investment', {
            p_investment_id: id,
            p_admin_id: user.id,
            p_settlement_destination: 'offline_cash',
            p_idempotency_key: body.idempotencyKey || null,
            p_notes: body.notes || 'Settled offline via settle-cash endpoint',
        });

        if (error) {
            console.error('[settle-cash RPC error]:', error);
            return NextResponse.json(
                { error: error.message || 'Offline settlement failed.' },
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
        console.error('Settle cash error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
    }
}
