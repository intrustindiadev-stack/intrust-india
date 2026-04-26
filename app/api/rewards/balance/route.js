import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch reward balance with tier config for progress calculation
        const { data: balance, error: balanceError } = await supabase
            .from('reward_points_balance')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (balanceError && balanceError.code !== 'PGRST116') {
            console.error('Error fetching reward balance:', balanceError);
            return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
        }

        // Fetch next tier requirements
        const tiers = ['bronze', 'silver', 'gold', 'platinum'];
        const currentTierIndex = tiers.indexOf(balance?.tier || 'bronze');
        const nextTier = tiers[currentTierIndex + 1];

        let nextTierConfig = null;
        if (nextTier) {
            const { data: tierConfig } = await supabase
                .from('reward_configuration')
                .select('config_value')
                .eq('config_key', `tier_${nextTier}`)
                .single();
            nextTierConfig = tierConfig?.config_value || null;
        }

        return NextResponse.json({
            balance: balance || {
                user_id: user.id,
                total_earned: 0,
                total_redeemed: 0,
                current_balance: 0,
                tier: 'bronze',
                tree_size: 0,
                direct_referrals: 0,
                active_downline: 0
            },
            next_tier: nextTier,
            next_tier_config: nextTierConfig
        });

    } catch (error) {
        console.error('Reward Balance API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
