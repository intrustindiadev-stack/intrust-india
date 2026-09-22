import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { targetId, recipientName, recipientPhone, shippingAddress } = body;

        if (!targetId || !UUID_RE.test(String(targetId))) {
            return NextResponse.json({ success: false, error: 'Invalid target identifier' }, { status: 400 });
        }

        const adminSupabase = createAdminClient();

        // 1. Fetch Target Details
        const { data: target, error: targetError } = await adminSupabase
            .from('marketing_targets')
            .select('*')
            .eq('id', targetId)
            .eq('is_active', true)
            .maybeSingle();

        if (targetError || !target) {
            return NextResponse.json({ success: false, error: 'Target not found or inactive' }, { status: 404 });
        }

        // 2. Check if already claimed
        const { data: existingClaim } = await adminSupabase
            .from('marketing_target_claims')
            .select('id, status, created_at')
            .eq('target_id', targetId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingClaim) {
            return NextResponse.json({
                success: false,
                error: 'This milestone target has already been claimed.',
                claimedAt: existingClaim.created_at
            }, { status: 409 });
        }

        // 3. Verify user progress against target requirements
        const [statsRes, streakRes] = await Promise.allSettled([
            adminSupabase.rpc('get_marketing_dashboard_stats', { p_user_id: user.id }),
            adminSupabase.rpc('get_user_quiz_streak', { p_user_id: user.id })
        ]);

        const stats = statsRes.status === 'fulfilled' ? statsRes.value.data : {};
        const streak = streakRes.status === 'fulfilled' ? streakRes.value.data : {};

        let currentProgress = 0;
        if (target.metric_type === 'quiz_streak') {
            currentProgress = Math.max(Number(streak?.current_streak || 0), Number(streak?.highest_streak || 0));
        } else if (target.metric_type === 'share_links') {
            currentProgress = Number(stats?.total_shares || 0);
        } else if (target.metric_type === 'link_clicks') {
            currentProgress = Number(stats?.link_clicks || 0);
        } else if (target.metric_type === 'referrals') {
            currentProgress = Number(stats?.new_customers || 0);
        } else if (target.metric_type === 'store_sales') {
            currentProgress = Number(stats?.orders || 0);
        } else if (target.metric_type === 'user_registration') {
            currentProgress = 1; // User is registered and logged in
        } else if (target.metric_type === 'daily_login') {
            currentProgress = Math.max(Number(streak?.current_streak || 0), 1);
        } else if (target.metric_type === 'first_order') {
            currentProgress = Number(stats?.orders || 0) >= 1 ? 1 : 0;
        } else {
            currentProgress = Number(stats?.total_shares || 0) + Number(stats?.orders || 0);
        }

        const requiredGoal = Number(target.target_value || 1);
        if (currentProgress < requiredGoal) {
            return NextResponse.json({
                success: false,
                error: `Target requirement not yet reached (${currentProgress}/${requiredGoal}).`
            }, { status: 400 });
        }

        // 4. Physical Gift Address Validation
        if (target.reward_type === 'physical_gift') {
            if (!recipientName?.trim() || !recipientPhone?.trim() || !shippingAddress?.trim()) {
                return NextResponse.json({
                    success: false,
                    error: 'Recipient name, phone, and delivery address are required for physical milestone gifts.'
                }, { status: 400 });
            }
        }

        // 5. Execute Atomic claim_marketing_target_reward RPC
        const { data: claimResult, error: rpcError } = await adminSupabase.rpc('claim_marketing_target_reward', {
            p_target_id: target.id,
            p_recipient_name: recipientName?.trim() || user.user_metadata?.full_name || 'Valued Member',
            p_recipient_phone: recipientPhone?.trim() || user.phone || '',
            p_shipping_address: shippingAddress?.trim() || '',
            p_user_id: user.id
        });

        if (rpcError) {
            return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
        }

        if (!claimResult || !claimResult.success) {
            return NextResponse.json({ success: false, error: claimResult?.message || 'Failed to claim reward' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            claim: {
                id: claimResult.claim_id,
                target_id: target.id,
                user_id: user.id,
                gift_title: claimResult.gift_title,
                status: claimResult.status,
                marketing_targets: target
            },
            message: target.reward_type === 'cashback'
                ? `₹${(Number(target.reward_value_paise || 0) / 100).toFixed(2)} wallet credit successfully applied!`
                : `Congratulations! Your milestone claim for "${claimResult.gift_title}" has been registered.`
        });
    } catch (err) {
        console.error('Error in marketing claims route:', err);
        return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
    }
}
