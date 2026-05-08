import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { logRewardRpcResult } from '@/lib/rewardRpcResult';

export async function POST(req) {
    try {
        // 1. Authenticate the caller
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { referral_code_entered } = body;

        if (!referral_code_entered) {
            return NextResponse.json({ error: 'Referral code is required' }, { status: 400 });
        }

        const userId = user.id;
        const adminClient = createAdminClient();

        // 2. Guard: check if referred_by is already set
        const { data: profile, error: profileError } = await adminClient
            .from('user_profiles')
            .select('referred_by, referral_code')
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error('Error fetching user profile:', profileError);
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
        }

        if (profile.referred_by) {
            return NextResponse.json({ error: 'You have already used a referral code' }, { status: 400 });
        }

        // 3. Validate code against user_profiles.referral_code
        const codeToFind = referral_code_entered.toUpperCase().trim();

        // Reject self-referral
        if (profile.referral_code === codeToFind) {
            return NextResponse.json({ error: 'You cannot refer yourself' }, { status: 400 });
        }

        const { data: referrer, error: referrerError } = await adminClient
            .from('user_profiles')
            .select('id, full_name')
            .eq('referral_code', codeToFind)
            .single();

        if (referrerError || !referrer) {
            return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
        }

        const referredById = referrer.id;

        // 4. On success, run the referral sequence

        // 4A. UPDATE user_profiles
        const { error: updateError } = await adminClient
            .from('user_profiles')
            .update({
                referred_by: referredById,
                reward_parent_id: referredById,
                updated_at: new Date()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user profile:', updateError);
            return NextResponse.json({ error: 'Failed to apply referral' }, { status: 500 });
        }

        try {
            // 4B. RPC build_reward_tree_path
            const { error: treePathError } = await adminClient.rpc('build_reward_tree_path', {
                p_new_user_id: userId,
                p_parent_id: referredById
            });
            if (treePathError) throw treePathError;

            // 4C. RPC calculate_and_distribute_rewards with p_event_type: 'signup'
            const { data: rewardData, error: rewardDistError } = await adminClient.rpc('calculate_and_distribute_rewards', {
                p_event_type: 'signup',
                p_source_user_id: userId,
                p_reference_id: userId,
                p_reference_type: 'user_profile'
            });
            if (rewardDistError) throw rewardDistError;
            logRewardRpcResult({
                event_type: 'signup',
                source_user_id: userId,
                reference_id: userId,
                reference_type: 'user_profile',
            }, rewardData);

            // 4D. RPC update_reward_tree_stats for all ancestors + the caller
            // Fetch ancestors
            const { data: ancestors } = await adminClient
                .from('reward_tree_paths')
                .select('ancestor_id')
                .eq('descendant_id', userId);

            if (ancestors) {
                for (const ancestor of ancestors) {
                    await adminClient.rpc('update_reward_tree_stats', {
                        p_user_id: ancestor.ancestor_id
                    });

                    // Recalculate tier for this ancestor
                    await adminClient.rpc('recalculate_user_tier', {
                        p_user_id: ancestor.ancestor_id
                    }).catch(err => console.error(`recalculate_user_tier failed for ancestor ${ancestor.ancestor_id}:`, err));
                }
            }

            // Update caller stats
            await adminClient.rpc('update_reward_tree_stats', {
                p_user_id: userId
            });

            // Recalculate tier for the caller
            await adminClient.rpc('recalculate_user_tier', {
                p_user_id: userId
            }).catch(err => console.error(`recalculate_user_tier failed for caller ${userId}:`, err));

            // 4E. Insert two notifications rows
            const { data: callerProfile } = await adminClient.from('user_profiles').select('full_name').eq('id', userId).single();
            const callerName = callerProfile?.full_name || 'A new user';

            await adminClient.from('notifications').insert([
                {
                    user_id: userId,
                    title: 'Welcome to the Network! 🌱',
                    body: `You've joined ${referrer.full_name}'s referral network. Earn reward points as your network grows.`,
                    type: 'success',
                    reference_type: 'referral_joined',
                },
                {
                    user_id: referredById,
                    title: 'New Referral! 🤝',
                    body: `${callerName} joined using your referral code. Your network is growing!`,
                    type: 'success',
                    reference_type: 'referral_new_member',
                },
            ]);

        } catch (sequenceError) {
            console.error('Error in referral sequence (non-fatal for the link itself):', sequenceError);
            // We return success anyway because the primary link (referred_by) is already done
        }

        return NextResponse.json({ success: true, referralApplied: true });

    } catch (error) {
        console.error('Referral Apply API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
