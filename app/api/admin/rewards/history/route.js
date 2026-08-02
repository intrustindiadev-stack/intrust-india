import { createServerSupabaseClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

async function requireAdmin(request) {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const supabaseAdmin = createAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile || !['admin', 'super_admin'].includes(profile.role)) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { user, profile };
}

export async function GET(request) {
    try {
        const auth = await requireAdmin(request);
        if (auth.error) return auth.error;

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        const supabaseAdmin = createAdminClient();

        // Get history
        const { data: historyData, error, count } = await supabaseAdmin
            .from('reward_configuration_history')
            .select('*', { count: 'exact' })
            .order('changed_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching reward config history:', error);
            return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
        }

        let history = historyData || [];

        // Manual join for user profiles
        if (history.length > 0) {
            const userIds = [...new Set(history.map(h => h.changed_by).filter(Boolean))];
            if (userIds.length > 0) {
                const { data: profiles } = await supabaseAdmin
                    .from('user_profiles')
                    .select('id, full_name, email')
                    .in('id', userIds);

                if (profiles) {
                    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
                    history = history.map(h => ({
                        ...h,
                        user_profiles: h.changed_by ? profileMap[h.changed_by] : null
                    }));
                }
            }
        }

        const response = NextResponse.json({ 
            history,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
        
        response.headers.set('Cache-Control', 'no-store, max-age=0');
        return response;

    } catch (error) {
        console.error('Admin Reward History GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
