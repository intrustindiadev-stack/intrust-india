import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const maxDepth = parseInt(searchParams.get('depth') || '3');

        // Get the user's downline with profile info
        const { data: treeData, error: treeError } = await supabase
            .from('reward_tree_paths')
            .select(`
                level,
                descendant_id,
                created_at,
                descendant:user_profiles!reward_tree_paths_descendant_id_fkey(
                    id, full_name, avatar_url, referral_code, reward_tier, kyc_status,
                    reward_points_balance(total_earned, current_balance)
                )
            `)
            .eq('ancestor_id', user.id)
            .lte('level', maxDepth)
            .order('level', { ascending: true })
            .order('created_at', { ascending: true });

        if (treeError) {
            console.error('Error fetching tree data:', treeError);
            return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
        }

        const allDescendantIds = (treeData || []).map(row => row.descendant_id);

        // Get user's own stats
        const { data: myStats } = await supabase
            .from('reward_points_balance')
            .select('*')
            .eq('user_id', user.id)
            .single();

        const { data: myProfile } = await supabase
            .from('user_profiles')
            .select('full_name, avatar_url, referral_code, reward_tier')
            .eq('id', user.id)
            .single();

        // Build hierarchical tree structure
        const tree = {
            user_id: user.id,
            full_name: myProfile?.full_name || 'You',
            avatar_url: myProfile?.avatar_url,
            tier: myProfile?.reward_tier || 'bronze',
            referral_code: myProfile?.referral_code,
            stats: myStats || {},
            children: []
        };

        const nodeMap = new Map();
        nodeMap.set(user.id, tree);

        // First pass: create all nodes
        for (const row of (treeData || [])) {
            const desc = row.descendant;
            if (!desc || nodeMap.has(desc.id)) continue;

            const rpb = Array.isArray(desc.reward_points_balance) ? desc.reward_points_balance[0] : desc.reward_points_balance;

            nodeMap.set(desc.id, {
                user_id: desc.id,
                full_name: desc.full_name || 'User',
                avatar_url: desc.avatar_url,
                tier: desc.reward_tier || 'bronze',
                referral_code: desc.referral_code,
                level: row.level,
                kyc_status: desc.kyc_status,
                joined_at: row.created_at,
                total_earned: rpb?.total_earned ?? 0,
                current_balance: rpb?.current_balance ?? 0,
                children: []
            });
        }

        // Second pass: build parent-child relationships
        // We need to find the parent for each node (the ancestor at level - 1)
        if (allDescendantIds.length > 0) {
            const { data: directPaths } = await supabase
                .from('reward_tree_paths')
                .select('ancestor_id, descendant_id')
                .in('descendant_id', allDescendantIds)
                .eq('level', 1);

            const parentMap = new Map();
            for (const path of (directPaths || [])) {
                parentMap.set(path.descendant_id, path.ancestor_id);
            }

            for (const row of (treeData || [])) {
                const desc = row.descendant;
                if (!desc) continue;

                const childNode = nodeMap.get(desc.id);
                if (!childNode) continue;

                const parentId = parentMap.get(desc.id);
                if (parentId) {
                    const parentNode = nodeMap.get(parentId);
                    if (parentNode && !parentNode.children.find(c => c.user_id === desc.id)) {
                        parentNode.children.push(childNode);
                    }
                }
            }
        }

        return NextResponse.json({
            tree: tree,
            total_downline: myStats?.tree_size || 0,
            direct_referrals: myStats?.direct_referrals || 0
        });

    } catch (error) {
        console.error('Reward Tree API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
