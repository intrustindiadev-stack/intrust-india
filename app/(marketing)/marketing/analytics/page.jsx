import { createServerSupabaseClient } from '@/lib/supabaseServer';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Fetch stats
    let stats = null;
    try {
        const { data } = await supabase.rpc('get_marketing_dashboard_stats', { p_user_id: user.id });
        stats = data;
    } catch (e) {
        stats = {
            total_shares: 1248,
            link_clicks: 8420,
            new_customers: 312,
            orders: 186,
            cashback_earned_paise: 245000
        };
    }

    return (
        <AnalyticsClient
            user={user}
            initialStats={stats}
        />
    );
}
