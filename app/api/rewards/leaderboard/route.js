import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We need a service account client to bypass RLS and view all users' balances
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const revalidate = 60; // Cache for 60 seconds (ISR)
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch top 50 users by current_balance
        const { data: topPoints, error: pointsError } = await supabaseAdmin
            .from('reward_points_balance')
            .select('user_id, current_balance, tier')
            .order('current_balance', { ascending: false })
            .limit(50);

        if (pointsError) {
            console.error('Error fetching top points:', pointsError);
            return NextResponse.json({ error: 'Failed to fetch leaderboard data' }, { status: 500 });
        }

        if (!topPoints || topPoints.length === 0) {
            return NextResponse.json({ success: true, leaderboard: [] });
        }

        // 2. Fetch profile data for these users
        const userIds = topPoints.map(p => p.user_id);
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('user_profiles')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

        if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
            return NextResponse.json({ error: 'Failed to fetch user profiles' }, { status: 500 });
        }

        // 3. Merge and format the data
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const leaderboard = topPoints.map((item, index) => {
            const profile = profileMap.get(item.user_id);
            return {
                rank: index + 1,
                userId: item.user_id,
                name: profile?.full_name || 'Anonymous User',
                avatarUrl: profile?.avatar_url || null,
                points: item.current_balance || 0,
                tier: item.tier || 'bronze'
            };
        });

        return NextResponse.json({ success: true, leaderboard });

    } catch (error) {
        console.error('Leaderboard API Exception:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
