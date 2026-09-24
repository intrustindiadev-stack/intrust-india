import { createServerSupabaseClient } from '@/lib/supabaseServer';
import TargetsClient from './TargetsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function TargetsPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Check user profile & merchant
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

    const isMerchant = profile?.role === 'merchant' || profile?.role === 'admin' || profile?.role === 'super_admin';

    // Fetch active targets
    const { data: targets } = await supabase
        .from('marketing_targets')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    // Fetch user's claimed targets & fulfillment records
    const { data: claims } = await supabase
        .from('marketing_target_claims')
        .select('*, marketing_targets(title, gift_name, reward_type, gift_image_url)')
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false });

    // Fetch user marketing stats for live target progress calculation
    const { data: userStats } = await supabase
        .rpc('get_marketing_dashboard_stats', { p_user_id: user.id });

    const userProgress = {
        total_shares: Number(userStats?.total_shares || 0),
        link_clicks: Number(userStats?.link_clicks || 0),
        new_customers: Number(userStats?.new_customers || 0),
        orders: Number(userStats?.orders || 0)
    };

    return (
        <TargetsClient
            user={user}
            profile={profile}
            isMerchant={isMerchant}
            initialTargets={targets || []}
            initialClaims={claims || []}
            userProgress={userProgress}
        />
    );
}
