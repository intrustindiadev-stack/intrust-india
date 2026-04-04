import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

const ADMIN_ROLES = ['admin', 'super_admin'];

export async function GET(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!ADMIN_ROLES.includes(profile?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { data, error } = await admin
            .from('user_profiles')
            .select('id, full_name, email, role')
            .eq('role', 'admin')
            .order('full_name');

        if (error) throw error;

        return NextResponse.json({ admins: data || [] });
    } catch (err) {
        console.error('[API] Admin Users GET Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
