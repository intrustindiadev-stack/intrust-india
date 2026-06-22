import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Authenticate the requesting user via cookie-based client
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin client bypasses RLS so we can read reward_points_balance for downline users
        let adminClient;
        try {
            adminClient = createAdminClient();
        } catch (err) {
            console.error('Failed to initialize admin client:', err);
            return NextResponse.json(
                { error: 'Service unavailable', code: 'admin_client_unavailable' },
                { status: 503 }
            );
        }

        // 1. Fetch all descendants up to depth 7
        const { data: treeData, error: treeError } = await adminClient
            .from('reward_tree_paths')
            .select(`
                level,
                descendant_id,
                created_at
            `)
            .eq('ancestor_id', user.id)
            .lte('level', 7)
            .order('level', { ascending: true })
            .order('created_at', { ascending: true });

        if (treeError) {
            console.error('Error fetching referral tree data:', treeError);
            return NextResponse.json({ error: 'Failed to fetch network' }, { status: 500 });
        }

        const descendantIds = (treeData || []).map(r => r.descendant_id);

        // Fetch upline (ancestors)
        const { data: uplineData, error: uplineError } = await adminClient
            .from('reward_tree_paths')
            .select(`
                level,
                ancestor_id,
                created_at
            `)
            .eq('descendant_id', user.id)
            .order('level', { ascending: true });

        if (uplineError) {
            console.error('Error fetching upline data:', uplineError);
            return NextResponse.json({ error: 'Failed to fetch upline' }, { status: 500 });
        }

        const ancestorIds = (uplineData || []).map(r => r.ancestor_id);
        const allUserIdsToFetch = [...new Set([...descendantIds, ...ancestorIds])];

        // 2. Fetch user profiles for all descendants & ancestors in one query
        let profilesMap = {};
        if (allUserIdsToFetch.length > 0) {
            const { data: profiles, error: pError } = await adminClient
                .from('user_profiles')
                .select('id, full_name, avatar_url, kyc_status')
                .in('id', allUserIdsToFetch);

            if (pError) throw pError;

            for (const p of (profiles || [])) {
                profilesMap[p.id] = p;
            }
        }

        // 3. Fetch reward balances for all descendants in one query
        let balancesMap = {};
        if (descendantIds.length > 0) {
            const { data: balances, error: bError } = await adminClient
                .from('reward_points_balance')
                .select('user_id, total_earned, current_balance')
                .in('user_id', descendantIds);

            if (bError) throw bError;

            for (const b of (balances || [])) {
                balancesMap[b.user_id] = b;
            }
        }

        // 4. Fetch own profile and balance (use cookie client — user can see their own data)
        const [{ data: myProfile, error: myProfileError }, { data: myBalance, error: myBalanceError }] = await Promise.all([
            supabase
                .from('user_profiles')
                .select('full_name, avatar_url, kyc_status')
                .eq('id', user.id)
                .single(),
            supabase
                .from('reward_points_balance')
                .select('total_earned, current_balance, tree_size, direct_referrals')
                .eq('user_id', user.id)
                .single()
        ]);

        if (myProfileError) throw myProfileError;
        if (myBalanceError && myBalanceError.code !== 'PGRST116') throw myBalanceError;

        // 5. Build node map
        const nodeMap = new Map();

        // Root node (the authenticated user)
        nodeMap.set(user.id, {
            user_id: user.id,
            full_name: myProfile?.full_name || 'You',
            avatar_url: myProfile?.avatar_url || null,
            level: 0,
            kyc_status: myProfile?.kyc_status || null,
            joined_at: null,
            reward_points: {
                total_earned: myBalance?.total_earned || 0,
                current_balance: myBalance?.current_balance || 0
            },
            children: []
        });

        // Descendant nodes — mask name to "First L." format for privacy
        for (const row of (treeData || [])) {
            const id = row.descendant_id;
            if (nodeMap.has(id)) continue;

            const profile = profilesMap[id] || {};
            const balance = balancesMap[id] || {};

            // Mask name: "Rahul Sharma" → "Rahul S."
            const rawName = profile.full_name || 'User';
            const parts = rawName.trim().split(/\s+/);
            const maskedName = parts.length > 1
                ? `${parts[0]} ${parts[parts.length - 1][0]}.`
                : rawName;

            nodeMap.set(id, {
                user_id: id,
                full_name: maskedName,
                avatar_url: profile.avatar_url || null,
                level: row.level,
                kyc_status: profile.kyc_status || null,
                joined_at: row.created_at,
                reward_points: {
                    total_earned: balance.total_earned || 0,
                    current_balance: balance.current_balance || 0
                },
                children: []
            });
        }

        // Build upline array
        const upline = (uplineData || []).map(row => {
            const profile = profilesMap[row.ancestor_id] || {};
            const isL1 = row.level === 1;

            const rawName = profile.full_name || 'User';
            let finalName = rawName;

            if (!isL1) {
                const parts = rawName.trim().split(/\s+/);
                finalName = parts.length > 1
                    ? `${parts[0]} ${parts[parts.length - 1][0]}.`
                    : rawName;
            }

            return {
                user_id: row.ancestor_id,
                full_name: finalName,
                avatar_url: profile.avatar_url || null,
                level: row.level,
                kyc_status: profile.kyc_status || null,
                joined_at: row.created_at
            };
        });

        // 6. Build parent–child relationships using level-1 ancestor paths
        // Fetch direct-parent (level=1) entries for each descendant
        let parentPathsMap = {};
        if (descendantIds.length > 0) {
            const { data: parentPaths, error: parentPathsError } = await adminClient
                .from('reward_tree_paths')
                .select('descendant_id, ancestor_id')
                .in('descendant_id', descendantIds)
                .eq('level', 1);

            if (parentPathsError) throw parentPathsError;

            for (const pp of (parentPaths || [])) {
                parentPathsMap[pp.descendant_id] = pp.ancestor_id;
            }
        }

        for (const row of (treeData || [])) {
            const childNode = nodeMap.get(row.descendant_id);
            if (!childNode) continue;

            const parentId = parentPathsMap[row.descendant_id];
            if (!parentId) continue;

            const parentNode = nodeMap.get(parentId);
            if (parentNode && !parentNode.children.find(c => c.user_id === row.descendant_id)) {
                parentNode.children.push(childNode);
            }
        }

        // 7. Aggregate network-level stats
        const totalNetworkSize = myBalance?.tree_size || descendantIds.length;
        const directReferrals = myBalance?.direct_referrals || 0;
        const totalNetworkPointsEarned = Object.values(balancesMap).reduce(
            (sum, b) => sum + (b.total_earned || 0), 0
        );

        return NextResponse.json({
            tree: nodeMap.get(user.id),
            upline: upline,
            total_network_size: totalNetworkSize,
            direct_referrals: directReferrals,
            total_network_points_earned: totalNetworkPointsEarned
        });

    } catch (error) {
        console.error('Referral Network API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
