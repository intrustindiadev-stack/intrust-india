import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';

/**
 * GET /api/crm/analytics
 *
 * Returns pre-aggregated CRM analytics from the server-side RPC.
 * Query params:
 *   - from  (ISO datetime, optional) — window start
 *   - to    (ISO datetime, optional) — window end
 *   - range ('7d' | '30d' | 'all', optional) — convenience shorthand; overrides from/to
 */
export async function GET(request) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const adminClient = createAdminClient();
        const { data: profile, error: profileError } = await adminClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
        }

        const allowedRoles = ['relationship_exec', 'relationship_manager', 'admin', 'super_admin'];
        if (!allowedRoles.includes(profile.role)) {
            return NextResponse.json({ error: 'Unauthorized role' }, { status: 403 });
        }

        const isManager = ['relationship_manager', 'admin', 'super_admin'].includes(profile.role);

        // Parse time range
        const url = new URL(request.url);
        let fromDate = url.searchParams.get('from') || null;
        let toDate = url.searchParams.get('to') || null;
        const range = url.searchParams.get('range') || null;

        if (range && range !== 'all') {
            const now = new Date();
            const from = new Date();
            if (range === '7d') from.setDate(now.getDate() - 7);
            else if (range === '30d') from.setDate(now.getDate() - 30);
            fromDate = from.toISOString();
            toDate = now.toISOString();
        }

        const { data, error } = await adminClient.rpc('crm_get_dashboard_stats', {
            p_user_id:   user.id,
            p_is_manager: isManager,
            p_from_date:  fromDate,
            p_to_date:    toDate,
        });

        if (error) {
            console.error('[API] crm_get_dashboard_stats error:', error);
            return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
        }

        return NextResponse.json({
            analytics: data,
            meta: {
                userId: user.id,
                isManager,
                fromDate,
                toDate,
                range,
            }
        });

    } catch (err) {
        console.error('[API] /api/crm/analytics unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
