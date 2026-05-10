/**
 * @deprecated Use POST /api/rewards/scratch/[id] instead.
 *
 * This PATCH endpoint is kept for backward compatibility only.
 * It does NOT return pointsWon / newBalance / tier — use the new
 * server-driven endpoint for authoritative balance updates.
 *
 * Will be removed in a future release once all clients migrate.
 */
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rateLimit';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

/** Simple UUID-v4 shape guard (cheap, no external dep). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request) {
    const logger = createRequestLogger('scratch');

    try {
        const supabase = await createServerSupabaseClient();

        // ── Authentication ────────────────────────────────────────────────────
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, code: 'unauthorized' }, { status: 401 });
        }

        // ── Rate-limit (30 per 60 s per user) ────────────────────────────────
        const { allowed, retryAfterMs } = checkRateLimit(`scratch:${user.id}`, {
            limit: 30,
            windowMs: 60_000,
        });

        if (!allowed) {
            const retryAfterSec = Math.ceil(retryAfterMs / 1000);
            logger.error('scratch_rate_limited', { userId: user.id, retryAfterSec });
            return NextResponse.json(
                { success: false, code: 'rate_limited' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(retryAfterSec) },
                }
            );
        }

        // ── Input validation ──────────────────────────────────────────────────
        const body = await request.json();
        const { transactionId } = body;

        if (!transactionId || !UUID_RE.test(String(transactionId))) {
            return NextResponse.json({ success: false, code: 'bad_request' }, { status: 400 });
        }

        // ── Idempotent UPDATE (maybeSingle so no throw on 0 rows) ─────────────
        const { data, error: updateError } = await supabase
            .from('reward_transactions')
            .update({ is_scratched: true })
            .eq('id', transactionId)
            .eq('user_id', user.id)
            .eq('is_scratched', false)   // guard: only if still unscratched
            .select()
            .maybeSingle();

        if (updateError) {
            logger.error('scratch_update_failed', { code: updateError.code });
            return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
        }

        // Row was updated → success
        if (data !== null) {
            return NextResponse.json({ success: true, code: 'scratched', transaction: data });
        }

        // No row matched — check whether it's already scratched (idempotency)
        const { data: existing, error: selectError } = await supabase
            .from('reward_transactions')
            .select('id, is_scratched')
            .eq('id', transactionId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (selectError) {
            logger.error('scratch_select_failed', { code: selectError.code });
            return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
        }

        if (existing?.is_scratched === true) {
            // Already scratched by a previous call — idempotent 200
            return NextResponse.json({ success: true, code: 'already_scratched' });
        }

        // Row doesn't exist for this user
        return NextResponse.json({ success: false, code: 'not_found' }, { status: 404 });

    } catch (err) {
        const logger = createRequestLogger('scratch');
        logger.error('scratch_unexpected', { type: err?.constructor?.name });
        return NextResponse.json({ success: false, code: 'server_error' }, { status: 500 });
    }
}
