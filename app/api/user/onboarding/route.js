import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { logRewardRpcResult, logRewardRpcFailure } from '@/lib/rewardRpcResult';
import { notifyRewardEarned } from '@/lib/rewardNotifications';

export const runtime = 'nodejs';

export async function POST(req) {
    const correlationId = crypto.randomUUID();
    try {
        // 0. Authenticate the caller — derive userId from session, never trust the body.
        const supabaseUser = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = user.id;

        // We need a service account client to bypass RLS and update profiles & wallets safely
        const supabaseAdmin = createAdminClient();

        const body = await req.json();
        const { services, occupation, referral_source, referral_code_entered } = body;

        const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
            .from('user_profiles')
            .select('referred_by, completed_onboarding')
            .eq('id', userId)
            .single();

        if (existingProfileError) {
            console.error('Error fetching existing profile for onboarding:', existingProfileError);
            return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
        }

        const firstOnboardingCompletion = !existingProfile?.completed_onboarding;
        let signupRewardApplied = false;

        // 1. Process Referral Logic BEFORE marking onboarding as complete
        let referredById = null;
        let referralApplied = false;

        if (referral_code_entered) {
            // Normalize entered code
            const codeToFind = referral_code_entered.toUpperCase().trim();

            // Find the referrer by code
            const { data: referrer, error: referrerError } = await supabaseAdmin
                .from('user_profiles')
                .select('id, referral_code')
                .eq('referral_code', codeToFind)
                .single();

            if (referrerError || !referrer) {
                console.warn(`Invalid referral code entered: ${codeToFind}`, referrerError);
            } else if (referrer.id === userId) {
                console.warn(`User tried to use their own referral code: ${codeToFind}`);
            } else {
                if (existingProfile && !existingProfile.referred_by) {
                    // Only link if they haven't already been referred
                    referredById = referrer.id;
                    referralApplied = true;
                } else {
                    console.log(`User ${userId} already has referred_by set — skipping referral link.`);
                }
            }
        }

        // 2. Update the User's Profile
        const updatePayload = {
            completed_onboarding: true,
            services: Array.isArray(services) ? services : [],
            occupation: occupation || null,
            referral_source: referral_source || null,
            updated_at: new Date()
        };

        // Only set referred_by / reward_parent_id when a new referral is actually being applied
        // (i.e. referralApplied = true). Do NOT update if the user re-submits with a code
        // after already having been referred — that would silently overwrite their existing referrer.
        if (referralApplied && referredById) {
            updatePayload.referred_by = referredById;
            updatePayload.reward_parent_id = referredById;
        }

        const { error: updateError } = await supabaseAdmin
            .from('user_profiles')
            .update(updatePayload)
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user profile:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        // 3. Build tree path when this is a fresh referral. Signup reward emission
        // is handled separately so non-referred first-time onboarding still earns.
        if (referralApplied && referredById) {
            try {
                // 3A. Build the tree path in reward_tree_paths
                const { error: treePathError } = await supabaseAdmin.rpc('build_reward_tree_path', {
                    p_new_user_id: userId,
                    p_parent_id: referredById
                });
                if (treePathError) {
                    console.error(JSON.stringify({
                        correlationId, stage: 'tree_build_failed', userId, referredById,
                        pg_code: treePathError.code, pg_message: treePathError.message
                    }));
                    throw treePathError;
                }

                // 3C. Update tree stats for all ancestors
                const { data: ancestors, error: ancestorFetchError } = await supabaseAdmin
                    .from('reward_tree_paths')
                    .select('ancestor_id')
                    .eq('descendant_id', userId);

                if (ancestorFetchError) {
                    console.error(JSON.stringify({
                        correlationId, stage: 'tree_ancestor_fetch_failed', userId, referredById,
                        pg_code: ancestorFetchError.code, pg_message: ancestorFetchError.message
                    }));
                } else if (ancestors) {
                    for (const ancestor of ancestors) {
                        const { error: statsError } = await supabaseAdmin.rpc('update_reward_tree_stats', {
                            p_user_id: ancestor.ancestor_id
                        });
                        if (statsError) {
                            console.error(JSON.stringify({
                                correlationId, stage: 'tree_stats_failed', userId, referredById,
                                ancestor_id: ancestor.ancestor_id,
                                pg_code: statsError.code, pg_message: statsError.message
                            }));
                        }

                        // Recalculate tier for this ancestor
                        const { error: tierError } = await supabaseAdmin.rpc('recalculate_user_tier', {
                            p_user_id: ancestor.ancestor_id
                        });
                        if (tierError) {
                            console.error(JSON.stringify({
                                correlationId, stage: 'tier_recalc_failed', userId, referredById,
                                ancestor_id: ancestor.ancestor_id,
                                pg_code: tierError.code, pg_message: tierError.message
                            }));
                        }
                    }
                }

                // 3D. Update tree stats for the new user themselves so their tree_depth is set correctly
                const { error: selfStatsError } = await supabaseAdmin.rpc('update_reward_tree_stats', {
                    p_user_id: userId
                });
                if (selfStatsError) {
                    console.error(JSON.stringify({
                        correlationId, stage: 'tree_stats_failed', userId, referredById,
                        ancestor_id: userId,
                        pg_code: selfStatsError.code, pg_message: selfStatsError.message
                    }));
                }

                // Recalculate tier for the new user themselves
                const { error: selfTierError } = await supabaseAdmin.rpc('recalculate_user_tier', {
                    p_user_id: userId
                });
                if (selfTierError) {
                    console.error(JSON.stringify({
                        correlationId, stage: 'tier_recalc_failed', userId, referredById,
                        ancestor_id: userId,
                        pg_code: selfTierError.code, pg_message: selfTierError.message
                    }));
                }

            } catch (rewardError) {
                console.error(JSON.stringify({
                    correlationId, stage: 'reward_tree_sequence_failed', userId, referredById,
                    error: rewardError?.message || String(rewardError)
                }));
                // Don't fail onboarding if reward distribution fails
            }
        }

        if (firstOnboardingCompletion) {
            try {
                const { data: rewardData, error: rewardDistError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                    p_event_type: 'signup',
                    p_source_user_id: userId,
                    p_reference_id: userId,
                    p_reference_type: 'user_profile'
                });
                if (rewardDistError) {
                    console.error(JSON.stringify({
                        correlationId, stage: 'signup_distribute_failed', userId, referredById,
                        pg_code: rewardDistError.code, pg_message: rewardDistError.message
                    }));
                    logRewardRpcFailure({
                        event_type: 'signup',
                        source_user_id: userId,
                        reference_id: userId,
                        reference_type: 'user_profile',
                    }, rewardDistError, { correlationId });
                    throw rewardDistError;
                }

                const rewardResult = logRewardRpcResult({
                    event_type: 'signup',
                    source_user_id: userId,
                    reference_id: userId,
                    reference_type: 'user_profile',
                }, rewardData, { correlationId });
                signupRewardApplied = rewardResult.totalDistributed > 0;

                await notifyRewardEarned({
                    supabaseAdmin,
                    userId,
                    eventType: 'signup',
                    totalDistributed: rewardResult.totalDistributed,
                    referenceId: userId,
                    referenceType: 'user_profile'
                });
            } catch (rewardError) {
                console.error(JSON.stringify({
                    correlationId, stage: 'signup_distribute_failed', userId, referredById,
                    error: rewardError?.message || String(rewardError)
                }));
                // Don't fail onboarding if reward distribution fails
            }
        }

        if (referralApplied && referredById) {
            // Send in-app notifications to both users about the referral
            try {
                // Fetch names for personalisation
                const [{ data: newUserProfile }, { data: referrerProfile }] = await Promise.all([
                    supabaseAdmin.from('user_profiles').select('full_name').eq('id', userId).single(),
                    supabaseAdmin.from('user_profiles').select('full_name').eq('id', referredById).single(),
                ]);
                const newUserName = newUserProfile?.full_name || 'A new user';
                const referrerName = referrerProfile?.full_name || 'your referrer';

                await supabaseAdmin.from('notifications').insert([
                    {
                        user_id: userId,
                        title: 'Welcome to the Network! 🌱',
                        body: `You've joined ${referrerName}'s referral network. Earn reward points as your network grows.`,
                        type: 'success',
                        reference_type: 'referral_joined',
                    },
                    {
                        user_id: referredById,
                        title: 'New Referral! 🤝',
                        body: `${newUserName} joined using your referral code. Your network is growing!`,
                        type: 'success',
                        reference_type: 'referral_new_member',
                    },
                ]);
            } catch (notifErr) {
                console.error('Error sending referral notifications:', notifErr);
                // Non-fatal
            }
        }

        // 4. Ensure user has a reward_points_balance record
        const { data: existingBalance } = await supabaseAdmin
            .from('reward_points_balance')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!existingBalance) {
            const { error: balanceInsertError } = await supabaseAdmin
                .from('reward_points_balance')
                .insert({ user_id: userId, tier: 'bronze' });

            if (balanceInsertError) {
                console.error('Failed to create reward_points_balance record:', balanceInsertError);
            }
        }

        return NextResponse.json({
            success: true,
            referralApplied: referralApplied,
            rewardApplied: signupRewardApplied,
            message: signupRewardApplied
                ? 'Onboarding complete. Eligible reward points were applied.'
                : 'Onboarding complete.'
        });

    } catch (error) {
        console.error('Onboarding API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
