import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse }               from 'next/server';
import { createRequestLogger }        from '@/lib/logger';
import { checkRateLimit }             from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/** UUID-v4 shape guard */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/rewards/scratch/bulk
 *
 * Bulk reveal endpoint (Improvement #3).
 * Body: { ids: string[] }  — 1 to 50 transaction UUIDs.
 *
 * Uses a single Supabase UPDATE … IN (ids) statement for atomicity.
 * Returns:
 *   { success, totalPointsWon, scratchedCount, newBalance, tier,
 *     scratched: [{ id, points }, …] }
 *
 * Rate-limit: 10 / 60 s per user (key: scratch_bulk:<uid>).
 * Cards already scratched or belonging to another user are silently skipped
 * (NOT returned in `scratched[]`), preserving idempotency.
 */
export async function POST(request) {
    const logger = createRequestLogger('scratch_bulk');

    try {
        const supabase = await createServerSupabaseClient();

        // ── Authentication ────────────────────────────────────────────────────
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, code: 'unauthorized' }, { status: 401 });
        }

        // ── Rate-limit ────────────────────────────────────────────────────────
        const { allowed, retryAfterMs } = checkRateLimit(`scratch_bulk:${user.id}`, {
            limit: 10, windowMs: 60_000,
        });
        if (!allowed) {
            const retryAfterSec = Math.ceil(retryAfterMs / 1000);
            logger.error('rate_limited', { userId: user.id, retryAfterSec });
            return NextResponse.json(
                { success: false, code: 'rate_limited' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
            );
        }

        // ── Input validation ──────────────────────────────────────────────────
        let body;
        try { body = await request.json(); } catch {
            return NextResponse.json({ success: false, code: 'bad_request' }, { status: 400 });
        }

        const { ids } = body;

        if (!Array.isArray(ids) || ids.length === 0 || ids.length > 50) {
            return NextResponse.json(
                { success: false, code: 'bad_request', detail: 'ids must be array of 1–50 UUIDs' },
                { status: 400 }
            );
        }

        const invalid = ids.find(id => !UUID_RE.test(String(id)));
        if (invalid) {
            return NextResponse.json(
                { success: false, code: 'bad_request', detail: `invalid UUID: ${invalid}` },
                { status: 400 }
            );
        }

        // ── Privileged Admin Client for DB update ─────────────────────────────
        const adminSupabase = createAdminClient();

        // ── Single UPDATE … IN (ids) ─────────────────────────────────────────
        // The extra .eq('user_id') + .eq('is_scratched', false) guards ensure
        // only unscratched cards owned by this user are touched.
        const { data: scratched, error: updateError } = await adminSupabase
            .from('reward_transactions')
            .update({ is_scratched: true })
            .in('id', ids)
            .eq('user_id', user.id)
            .eq('is_scratched', false)
            .select('id, points');

        if (updateError) {
            logger.error('bulk_update_failed', { code: updateError.code, message: updateError.message });
            return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
        }

        const scratchedList   = scratched ?? [];
        const totalPointsWon  = scratchedList.reduce((sum, r) => sum + (r.points ?? 0), 0);
        const scratchedCount  = scratchedList.length;

        // ── Re-fetch authoritative balance ────────────────────────────────────
        const { data: bal, error: balError } = await adminSupabase
            .from('reward_points_balance')
            .select('current_balance, tier')
            .eq('user_id', user.id)
            .maybeSingle();

        if (balError) {
            logger.error('bulk_balance_fetch_failed', { code: balError.code });
        }

        return NextResponse.json({
            success:        true,
            totalPointsWon,
            scratchedCount,
            newBalance:     bal?.current_balance ?? 0,
            tier:           bal?.tier           ?? 'bronze',
            scratched:      scratchedList,
        });

    } catch (err) {
        logger.error('unexpected', { message: err?.message, type: err?.constructor?.name });
        return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
    }
}
