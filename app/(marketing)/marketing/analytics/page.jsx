import { createServerSupabaseClient } from '@/lib/supabaseServer';
import AnalyticsClient from './AnalyticsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// Computed outside the component render body (server component, evaluated per request)
function getNinetyDaysAgoIso() {
    return new Date(Date.now() - NINETY_DAYS_MS).toISOString();
}

export default async function AnalyticsPage() {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 1. Fetch live marketing stats from RPC
    let stats = {
        total_shares: 0,
        link_clicks: 0,
        new_customers: 0,
        orders: 0,
        cashback_earned_paise: 0
    };

    try {
        const { data } = await supabase.rpc('get_marketing_dashboard_stats', { p_user_id: user.id });
        if (data) stats = data;
    } catch (e) {
        console.error('Failed to fetch marketing stats in analytics:', e);
    }

    // 2. Fetch user's share links with associated product details
    const { data: userLinks } = await supabase
        .from('marketing_share_links')
        .select('id, product_id, code, source, shares_count, clicks_count, registrations_count, orders_count, created_at, shopping_products(id, title, suggested_retail_price_paise, product_images)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    // 3. Fetch tracking events for these links (last 90 days)
    const linkIds = (userLinks || []).map(l => l.id);
    let trackingEvents = [];
    if (linkIds.length > 0) {
        const { data: events } = await supabase
            .from('marketing_tracking_events')
            .select('id, link_id, event_type, referer, metadata, created_at')
                        .in('link_id', linkIds)
            .gte('created_at', getNinetyDaysAgoIso())
            .order('created_at', { ascending: true });
        trackingEvents = events || [];
    }

    return (
        <AnalyticsClient
            user={user}
            initialStats={stats}
            userLinks={userLinks || []}
            trackingEvents={trackingEvents}
        />
    );
}
