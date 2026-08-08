import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Organization Timezone
    const { data: policy } = await admin
      .from('organization_policy')
      .select('timezone')
      .limit(1)
      .maybeSingle();

    const timezone = policy?.timezone || 'Asia/Kolkata';
    const businessDate = new Date().toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD

    // 1. Fetch Open Shift (for Stale Checkout or Active Shift)
    const { data: openShift } = await admin
      .from('attendance')
      .select('*')
      .eq('employee_id', user.id)
      .is('check_out', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Fetch Latest Payslip
    const { data: latestPayslip } = await admin
      .from('salary_records')
      .select('id, month, year, net_salary, status')
      .eq('employee_id', user.id)
      .eq('status', 'released')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Fetch Tasks (only count pending tasks assigned to user)
    const { count: tasksCount } = await admin
      .from('crm_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', user.id)
      .eq('status', 'pending');

    // 4. Fetch Leave Summary (Aggregated totals)
    const currentYear = new Date().getFullYear();
    const { data: balances } = await admin
      .from('employee_leave_balances')
      .select('available_days')
      .eq('employee_id', user.id)
      .eq('policy_year', currentYear);

    let remainingLeaves = 0;
    if (balances && balances.length > 0) {
        remainingLeaves = balances.reduce((sum, b) => sum + (Number(b.available_days) || 0), 0);
    }

    // 5. Fetch Next Holiday
    const { data: nextHolidays } = await admin
      .from('holidays')
      .select('*')
      .gte('holiday_date', businessDate)
      .order('holiday_date', { ascending: true })
      .limit(1);

    // 6. Fetch pending panel access request
    const { data: pendingAccessRequest } = await admin
      .from('panel_access_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const response = NextResponse.json({
      success: true,
      timezone,
      business_date: businessDate,
      open_shift: openShift || null,
      latest_payslip: latestPayslip || null,
      pending_tasks: tasksCount || 0,
      leave_balance: remainingLeaves,
      next_holiday: nextHolidays?.[0] || null,
      pending_access_request: pendingAccessRequest || null,
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Dashboard Summary Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
