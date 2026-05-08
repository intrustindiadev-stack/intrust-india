import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * Verifies the caller is authenticated and holds admin or super_admin role.
 * Returns { user, profile } on success or a NextResponse error on failure.
 */
async function requireAdmin(request) {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { user, profile };
}

/**
 * POST /api/admin/rewards/adjust
 *
 * Manually credit or debit reward points for a user.
 *
 * Body: { user_id, points, operation: 'credit'|'debit', reason }
 */
export async function POST(request) {
    try {
        const auth = await requireAdmin(request);
        if (auth.error) return auth.error;

        const body = await request.json();
        const { user_id, points, operation, reason } = body;

        // Validation
        if (!user_id || !points || !operation) {
            return NextResponse.json(
                { error: 'Missing required fields: user_id, points, operation' },
                { status: 400 }
            );
        }

        const parsedPoints = Number(points);
        if (!Number.isFinite(parsedPoints) || parsedPoints <= 0) {
            return NextResponse.json(
                { error: 'points must be a positive number' },
                { status: 400 }
            );
        }

        if (operation !== 'credit' && operation !== 'debit') {
            return NextResponse.json(
                { error: 'operation must be "credit" or "debit"' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // Fetch current balance
        const { data: balanceRow, error: balanceError } = await supabase
            .from('reward_points_balance')
            .select('current_balance, total_earned, total_redeemed')
            .eq('user_id', user_id)
            .maybeSingle();

        if (balanceError) {
            console.error('[rewards/adjust] balance fetch error:', balanceError);
            return NextResponse.json({ error: 'Database error fetching balance' }, { status: 500 });
        }

        const currentBalance = balanceRow?.current_balance ?? 0;

        // Debit guard
        if (operation === 'debit' && currentBalance < parsedPoints) {
            return NextResponse.json(
                { error: 'Insufficient balance' },
                { status: 400 }
            );
        }

        // Insert transaction record
        const { error: txError } = await supabase
            .from('reward_transactions')
            .insert({
                user_id,
                event_type: operation === 'credit' ? 'manual_credit' : 'manual_debit',
                points_earned: operation === 'credit' ? parsedPoints : -parsedPoints,
                description: reason || `Manual admin ${operation}`,
            });

        if (txError) {
            console.error('[rewards/adjust] transaction insert error:', txError);
            return NextResponse.json({ error: 'Database error inserting transaction' }, { status: 500 });
        }

        // Update balance
        let newBalance;
        let balanceUpdate;

        if (operation === 'credit') {
            newBalance = currentBalance + parsedPoints;
            balanceUpdate = {
                current_balance: newBalance,
                total_earned: (balanceRow?.total_earned ?? 0) + parsedPoints,
                updated_at: new Date().toISOString(),
            };
        } else {
            newBalance = currentBalance - parsedPoints;
            balanceUpdate = {
                current_balance: newBalance,
                total_redeemed: (balanceRow?.total_redeemed ?? 0) + parsedPoints,
                updated_at: new Date().toISOString(),
            };
        }

        if (balanceRow) {
            // Update existing row
            const { error: updateError } = await supabase
                .from('reward_points_balance')
                .update(balanceUpdate)
                .eq('user_id', user_id);

            if (updateError) {
                console.error('[rewards/adjust] balance update error:', updateError);
                return NextResponse.json({ error: 'Database error updating balance' }, { status: 500 });
            }
        } else {
            // Insert new row (shouldn't normally happen, but handle gracefully)
            const { error: insertError } = await supabase
                .from('reward_points_balance')
                .insert({
                    user_id,
                    current_balance: newBalance,
                    total_earned: operation === 'credit' ? parsedPoints : 0,
                    total_redeemed: operation === 'debit' ? parsedPoints : 0,
                    tier: 'bronze',
                });

            if (insertError) {
                console.error('[rewards/adjust] balance insert error:', insertError);
                return NextResponse.json({ error: 'Database error creating balance row' }, { status: 500 });
            }
        }

        // Notify the target user about the adjustment
        try {
            await supabase.from('notifications').insert({
                user_id,
                title: 'Reward Points Updated',
                body: 'Your Intrust Reward Points balance has been adjusted by an admin.',
                type: 'info',
                reference_type: 'reward_adjustment',
            });
        } catch {
            // Non-fatal
        }

        return NextResponse.json({ success: true, new_balance: newBalance });
    } catch (err) {
        console.error('[rewards/adjust] unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
