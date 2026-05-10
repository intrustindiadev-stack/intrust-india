import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse }               from 'next/server';
import { createRequestLogger }        from '@/lib/logger';
import { checkRateLimit }             from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** UUID-v4 shape guard — mirrored from parent route.js */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/rewards/scratch/[id]
 *
 * Server-driven reveal endpoint (Improvement #2).
 * Returns authoritative { pointsWon, newBalance, tier } from DB.
 *
 * Idempotency: second call on an already-scratched card returns
 *   { success: true, code: 'already_scratched', newBalance, tier }
 * with no double-credit.
 *
 * Rate-limit: 30 / 60 s per user (key: scratch_reveal:<uid>).
 *
 * Next 15/16 dynamic params are async — always `await params`.
 */
export async function POST(request, { params }) {
    const logger = createRequestLogger('scratch_reveal');

    try {
        // ── Async params (Next 15/16) ─────────────────────────────────────────
        const { id } = await params;

        // ── UUID validation ───────────────────────────────────────────────────
        if (!id || !UUID_RE.test(String(id))) {
            return NextResponse.json({ success: false, code: 'bad_request' }, { status: 400 });
        }

        const supabase = await createServerSupabaseClient();

        // ── Authentication ────────────────────────────────────────────────────
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, code: 'unauthorized' }, { status: 401 });
        }

        // ── Rate-limit ────────────────────────────────────────────────────────
        const { allowed, retryAfterMs } = checkRateLimit(`scratch_reveal:${user.id}`, {
            limit: 30, windowMs: 60_000,
        });
        if (!allowed) {
            const retryAfterSec = Math.ceil(retryAfterMs / 1000);
            logger.error('rate_limited', { userId: user.id, retryAfterSec });
            return NextResponse.json(
                { success: false, code: 'rate_limited' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
            );
        }

        // ── 1. Atomic UPDATE: mark scratched only if still unscratched ────────
        const { data: updated, error: updateError } = await supabase
            .from('reward_transactions')
            .update({ is_scratched: true })
            .eq('id', id)
            .eq('user_id', user.id)
            .eq('is_scratched', false)
            .select('id, points, event_type')
            .maybeSingle();

        if (updateError) {
            logger.error('update_failed', { code: updateError.code });
            return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
        }

        // Helper: fetch current balance + tier (one SELECT)
        const fetchBalance = async () => {
            const { data: bal } = await supabase
                .from('reward_points_balance')
                .select('current_balance, tier')
                .eq('user_id', user.id)
                .single();
            return { newBalance: bal?.current_balance ?? 0, tier: bal?.tier ?? 'bronze' };
        };

        // Row was updated → fresh scratch
        if (updated !== null) {
            const { newBalance, tier } = await fetchBalance();
            return NextResponse.json({
                success: true,
                code:     'scratched',
                pointsWon: updated.points,
                newBalance,
                tier,
            });
        }

        // ── 2. No row matched — check idempotency ─────────────────────────────
        const { data: existing, error: selectError } = await supabase
            .from('reward_transactions')
            .select('id, is_scratched')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (selectError) {
            logger.error('select_failed', { code: selectError.code });
            return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
        }

        if (existing?.is_scratched === true) {
            // Already scratched — return current balance for UI sync
            const { newBalance, tier } = await fetchBalance();
            return NextResponse.json({
                success: true,
                code:    'already_scratched',
                newBalance,
                tier,
            });
        }

        // ── 3. Row not found for this user ────────────────────────────────────
        return NextResponse.json({ success: false, code: 'not_found' }, { status: 404 });

    } catch (err) {
        createRequestLogger('scratch_reveal').error('unexpected', { type: err?.constructor?.name });
        return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
    }
}
