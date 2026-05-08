import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const role = profile?.role;
        if (role !== 'admin' && role !== 'super_admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        let query = admin
            .from('reward_redemption_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: requests, error } = await query;

        if (error) {
            console.error('Error fetching redemption requests:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Enrich with user profile data
        const userIds = [...new Set((requests || []).map(r => r.user_id))];
        const { data: profiles } = await admin
            .from('user_profiles')
            .select('id, full_name, phone, email')
            .in('id', userIds);

        const profileMap = {};
        if (profiles) {
            for (const p of profiles) {
                profileMap[p.id] = { full_name: p.full_name, phone: p.phone, email: p.email };
            }
        }

        const enriched = (requests || []).map(r => ({
            ...r,
            user_profiles: profileMap[r.user_id] || null
        }));

        return NextResponse.json({ requests: enriched });
    } catch (error) {
        console.error('Redemptions API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}