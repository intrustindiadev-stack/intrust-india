import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { record_id, lat, lng, is_onsite } = body;

        if (!record_id) {
            return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
        }

        const now = new Date().toISOString();

        // Verify record belongs to user
        const { data: existing } = await admin
            .from('attendance')
            .select('employee_id, check_out')
            .eq('id', record_id)
            .single();

        if (!existing || existing.employee_id !== user.id) {
            return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
        }

        if (existing.check_out) {
            return NextResponse.json({ error: 'Already clocked out.' }, { status: 400 });
        }

        // Update using server time (bypassing RLS)
        const { error } = await admin.from('attendance').update({
            check_out: now,
            check_out_lat: lat || null,
            check_out_lng: lng || null,
            is_onsite: is_onsite ?? true
        }).eq('id', record_id);

        if (error) throw error;

        return NextResponse.json({ success: true, check_out: now }, { status: 200 });
    } catch (err) {
        console.error('[API] Clock-Out Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
