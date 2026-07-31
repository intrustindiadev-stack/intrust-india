import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export async function POST(request) {
    try {
        const { user, profile, admin } = await getAuthUser(request);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { record_id } = body;

        if (!record_id) {
            return NextResponse.json({ error: 'Record ID is required.' }, { status: 400 });
        }

        // Fetch the record to ensure it belongs to the user and is indeed past
        const { data: existing } = await admin
            .from('attendance')
            .select('employee_id, date, check_out')
            .eq('id', record_id)
            .single();

        if (!existing || existing.employee_id !== user.id) {
            return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
        }

        if (existing.check_out) {
            return NextResponse.json({ error: 'Shift already closed.' }, { status: 400 });
        }

        // We use 23:59:59 of the *record's* date so the UI logic works out, or just use server logic.
        const prevDate = new Date(existing.date);
        prevDate.setHours(23, 59, 59);

        const { error } = await admin.from('attendance').update({
            check_out: prevDate.toISOString(),
            override_reason: 'Auto-closed past shift'
        }).eq('id', record_id);

        if (error) throw error;

        return NextResponse.json({ success: true, check_out: prevDate.toISOString() }, { status: 200 });
    } catch (err) {
        console.error('[API] Force Close Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
