import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

export async function POST(req) {
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
                // Check whether this user has already been referred (prevent double-dipping)
                // This guard runs regardless of completed_onboarding status so re-submissions are handled
                const { data: existingProfile, error: profileError } = await supabaseAdmin
                    .from('user_profiles')
                    .select('referred_by')
                    .eq('id', userId)
                    .single();

                if (profileError) {
                    console.error('Error fetching existing profile for referral guard:', profileError);
                } else if (existingProfile && !existingProfile.referred_by) {
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

        // 3. Build tree path and distribute rewards if this is a fresh referral
        if (referralApplied && referredById) {
            try {
                // 3A. Build the tree path in reward_tree_paths
                const { error: treePathError } = await supabaseAdmin.rpc('build_reward_tree_path', {
                    p_new_user_id: userId,
                    p_parent_id: referredById
                });
                if (treePathError) {
                    console.error('build_reward_tree_path RPC failed:', treePathError);
                    throw treePathError;
                }

                // 3B. Distribute signup rewards to upline
                // p_event_type must match the reward_event_type enum value 'signup'
                const { error: rewardDistError } = await supabaseAdmin.rpc('calculate_and_distribute_rewards', {
                    p_event_type: 'signup',
                    p_source_user_id: userId,
                    p_reference_id: userId,
                    p_reference_type: 'user_profile'
                });
                if (rewardDistError) {
                    console.error('calculate_and_distribute_rewards RPC failed:', rewardDistError);
                    throw rewardDistError;
                }

                // 3C. Update tree stats for all ancestors
                const { data: ancestors, error: ancestorFetchError } = await supabaseAdmin
                    .from('reward_tree_paths')
                    .select('ancestor_id')
                    .eq('descendant_id', userId);

                if (ancestorFetchError) {
                    console.error('Error fetching ancestor list for stats update:', ancestorFetchError);
                } else if (ancestors) {
                    for (const ancestor of ancestors) {
                        const { error: statsError } = await supabaseAdmin.rpc('update_reward_tree_stats', {
                            p_user_id: ancestor.ancestor_id
                        });
                        if (statsError) {
                            console.error(`update_reward_tree_stats failed for ancestor ${ancestor.ancestor_id}:`, statsError);
                        }

                        // Recalculate tier for this ancestor
                        const { error: tierError } = await supabaseAdmin.rpc('recalculate_user_tier', {
                            p_user_id: ancestor.ancestor_id
                        });
                        if (tierError) {
                            console.error(`recalculate_user_tier failed for ancestor ${ancestor.ancestor_id}:`, tierError);
                        }
                    }
                }

                // 3D. Update tree stats for the new user themselves so their tree_depth is set correctly
                const { error: selfStatsError } = await supabaseAdmin.rpc('update_reward_tree_stats', {
                    p_user_id: userId
                });
                if (selfStatsError) {
                    console.error(`update_reward_tree_stats failed for new user ${userId}:`, selfStatsError);
                }

                // Recalculate tier for the new user themselves
                const { error: selfTierError } = await supabaseAdmin.rpc('recalculate_user_tier', {
                    p_user_id: userId
                });
                if (selfTierError) {
                    console.error(`recalculate_user_tier failed for new user ${userId}:`, selfTierError);
                }

            } catch (rewardError) {
                console.error('Error in reward tree / distribution flow — onboarding will still complete:', rewardError);
                // Don't fail onboarding if reward distribution fails
            }

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
            message: referralApplied
                ? 'Onboarding complete. Referral bonus applied via Intrust Reward Points!'
                : 'Onboarding complete.'
        });

    } catch (error) {
        console.error('Onboarding API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
