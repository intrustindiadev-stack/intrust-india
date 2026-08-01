import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { computeAttendanceMetrics } from '@/lib/hrm/attendance';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    // Fetch org policy
    const { data: policy } = await admin
      .from('organization_policy')
      .select('*')
      .limit(1)
      .maybeSingle();

    const timezone = policy?.timezone || 'Asia/Kolkata';

    // Fetch open shift across all dates
    const { data: openShift } = await admin
      .from('attendance')
      .select('*')
      .eq('employee_id', user.id)
      .is('check_out', null)
      .limit(1)
      .maybeSingle();

    // Fetch paginated history (last 30-90 days)
    const { data: history, count } = await admin
      .from('attendance')
      .select('*', { count: 'exact' })
      .eq('employee_id', user.id)
      .order('work_date', { ascending: false })
      .range(offset, offset + limit - 1);

    const records = history || [];
    const metrics = computeAttendanceMetrics(records);

    const response = NextResponse.json({
      success: true,
      open_shift: openShift || null,
      business_date: new Date().toISOString().split('T')[0],
      timezone,
      metrics,
      history: records,
      pagination: {
        total: count || 0,
        page,
        limit,
        has_more: offset + records.length < (count || 0)
      },
      policy: policy || {
        timezone: 'Asia/Kolkata',
        standard_start_time: '09:30:00',
        standard_end_time: '18:30:00',
        grace_minutes: 15
      }
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Attendance Summary Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch attendance summary',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
