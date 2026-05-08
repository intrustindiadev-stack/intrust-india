import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { points } = body;

        if (!points || points <= 0) {
            return NextResponse.json({ error: 'Valid points amount required' }, { status: 400 });
        }

        const admin = createAdminClient();

        // ── Check redemption_mode config ──────────────────────────────────────
        const { data: modeConfig } = await admin
            .from('reward_configuration')
            .select('config_value')
            .eq('config_key', 'redemption_mode')
            .maybeSingle();

        let redemptionMode = 'instant';
        if (modeConfig?.config_value) {
            const cv = typeof modeConfig.config_value === 'string'
                ? modeConfig.config_value
                : JSON.stringify(modeConfig.config_value);
            try {
                redemptionMode = JSON.parse(cv);
            } catch {
                redemptionMode = cv.replace(/^"|"$/g, '');
            }
        }

        // ── approval_required mode: create a pending request ──────────────────
        if (redemptionMode === 'approval_required') {
            // Fetch points_per_rupee to calculate rupee value
            const { data: ppcConfig } = await admin
                .from('reward_configuration')
                .select('config_value')
                .eq('config_key', 'points_per_rupee')
                .maybeSingle();

            let pointsPerRupee = 1;
            if (ppcConfig?.config_value) {
                const cv = typeof ppcConfig.config_value === 'string'
                    ? ppcConfig.config_value
                    : JSON.stringify(ppcConfig.config_value);
                try {
                    pointsPerRupee = JSON.parse(cv) || 1;
                } catch {
                    pointsPerRupee = 1;
                }
            }

            const rupee_value_paise = Math.round((points / pointsPerRupee) * 100);

            // Insert the pending request
            const { error: insertError } = await admin
                .from('reward_redemption_requests')
                .insert({
                    user_id: user.id,
                    points_requested: points,
                    rupee_value_paise,
                    status: 'pending'
                });

            if (insertError) {
                console.error('Error creating redemption request:', insertError);
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }

            // Notify the user
            const rupees = (rupee_value_paise / 100).toFixed(2);
            try {
                await admin.from('notifications').insert({
                    user_id: user.id,
                    title: '⏳ Redemption Request Submitted',
                    body: `Your request to redeem ${points} points (₹${rupees}) is pending admin approval.`,
                    type: 'info',
                    reference_type: 'reward_redemption'
                });
            } catch {
                // Non-fatal
            }

            return NextResponse.json({
                success: true,
                mode: 'approval_required',
                message: 'Your redemption request has been submitted for approval.'
            });
        }

        // ── instant mode: proceed with direct RPC conversion ──────────────────
        const { data: result, error: rpcError } = await supabase.rpc('convert_points_to_wallet', {
            p_user_id: user.id,
            p_points: points
        });

        if (rpcError) {
            console.error('Error converting points:', rpcError);
            return NextResponse.json({ error: rpcError.message || 'Conversion failed' }, { status: 500 });
        }

        // result is a JSONB string, parse it
        const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;

        if (!parsedResult?.success) {
            return NextResponse.json({
                success: false,
                message: parsedResult?.message || 'Conversion failed'
            }, { status: 400 });
        }

        // Insert in-app notification for points redemption
        try {
            const rupees = (parsedResult.rupee_paise / 100).toFixed(2);
            await admin.from('notifications').insert({
                user_id: user.id,
                title: 'Points Redeemed 🎉',
                body: `You converted ${parsedResult.points_deducted} Intrust Reward Points to ₹${rupees} wallet cash.`,
                type: 'success',
                reference_type: 'reward_conversion',
            });
        } catch {
            // Non-fatal
        }

        return NextResponse.json({
            success: true,
            rupee_paise: parsedResult.rupee_paise,
            points_deducted: parsedResult.points_deducted,
            message: `Successfully converted ${parsedResult.points_deducted} points to ₹${(parsedResult.rupee_paise / 100).toFixed(2)}`
        });

    } catch (error) {
        console.error('Reward Convert API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

