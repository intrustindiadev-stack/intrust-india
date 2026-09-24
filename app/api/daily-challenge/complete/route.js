import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLACEHOLDER_CATEGORY_UUID = 'c0000000-0000-0000-0000-000000000001';

/**
 * Records a completed daily challenge by calling the SECURITY DEFINER RPC
 * `submit_daily_challenge`, which performs the reward credit, ledger insert,
 * streak update and target-milestone sync atomically in one transaction.
 *
 * This route is the single source of truth for quiz completion. The client
 * previously fell back to a direct `daily_challenge_plays` upsert whenever the
 * RPC failed, which silently created a play record WITHOUT crediting any
 * wallet or ledger row — the "played but got no cashback" bug.
 */
export async function POST(request) {
    const correlationId = `dc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const log = (stage, message, extra = {}) => {
        console.log(JSON.stringify({
            tag: '[DailyChallenge][complete]',
            correlationId,
            stage,
            message,
            ...extra,
        }));
    };

    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            log('auth', 'unauthorized', { authError: authError?.message || null });
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let body;
        try {
            body = await request.json();
        } catch (parseErr) {
            log('parse', 'invalid json body', { error: parseErr?.message });
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const { categoryId, score } = body || {};

        // ── Validate score ──────────────────────────────────────────────
        const parsedScore = Number(score);
        if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 10) {
            log('validate', 'invalid score', { score });
            return NextResponse.json(
                { success: false, error: 'Invalid score' },
                { status: 400 }
            );
        }

        // ── Validate category id (never forward a placeholder/dummy UUID) ──
        let safeCategoryId = null;
        if (categoryId && UUID_RE.test(String(categoryId)) && categoryId !== PLACEHOLDER_CATEGORY_UUID) {
            safeCategoryId = categoryId;
        }

        log('validate', 'validated', {
            userId: user.id,
            score: Math.trunc(parsedScore),
            categoryId: safeCategoryId,
        });

        // ── Execute the atomic RPC via the service-role client ───────────
        // The RPC resolves the acting user from auth.uid(); we also pass the
        // authenticated user id explicitly so a spoofed body cannot credit a
        // different account.
        const adminSupabase = createAdminClient();

        const { data, error: rpcError } = await adminSupabase.rpc('submit_daily_challenge', {
            p_category_id: safeCategoryId,
            p_score: Math.trunc(parsedScore),
            p_user_id: user.id,
        });

        if (rpcError) {
            log('rpc', 'submit_daily_challenge failed', {
                userId: user.id,
                error: rpcError.message,
                code: rpcError.code || null,
                details: rpcError.details || null,
                hint: rpcError.hint || null,
            });
            return NextResponse.json(
                {
                    success: false,
                    error: 'Could not record your challenge. Please try again.',
                    detail: rpcError.message,
                },
                { status: 500 }
            );
        }

        if (!data || data.success !== true) {
            // The RPC returns a structured business failure (e.g. already played today).
            // Surface the real message to the user instead of silently falling back.
            const message = data?.message || 'Challenge could not be recorded.';
            log('rpc', 'business failure', { userId: user.id, message });
            return NextResponse.json(
                { success: false, error: message, data },
                { status: 409 }
            );
        }

        const result = data;

        log('rpc', 'success', {
            userId: user.id,
            rewardPaise: result.reward_paise,
            newBalancePaise: result.new_balance_paise,
            currentStreak: result.current_streak,
            challengeDateIst: result.challenge_date_ist,
        });

        return NextResponse.json({
            success: true,
            data: result,
            // Flattened for backwards compatibility with existing callers
            ...result,
        });
    } catch (err) {
        log('exception', 'unhandled error', {
            error: err?.message || String(err),
            stack: err?.stack || null,
        });
        return NextResponse.json(
            {
                success: false,
                error: 'Unexpected server error while recording your challenge.',
            },
            { status: 500 }
        );
    }
}
