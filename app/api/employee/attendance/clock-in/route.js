import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { is_onsite, lat, lng } = body;

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        // Check if already clocked in today
        const { data: existing } = await admin
            .from('attendance')
            .select('id, check_in, check_out')
            .eq('employee_id', user.id)
            .eq('date', today)
            .maybeSingle();

        if (existing?.check_in) {
            return NextResponse.json({ error: 'Already clocked in for today.' }, { status: 400 });
        }

        // Insert new record using server time (bypassing RLS)
        const { data, error } = await admin.from('attendance').insert([{
            employee_id: user.id,
            date: today,
            check_in: now,
            is_onsite: is_onsite ?? true,
            check_in_lat: lat || null,
            check_in_lng: lng || null,
            status: 'present'
        }]).select().single();

        if (error) throw error;

        return NextResponse.json({ record: data }, { status: 201 });
    } catch (err) {
        console.error('[API] Clock-In Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
