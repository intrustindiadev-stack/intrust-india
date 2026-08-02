import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, profile, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required', code: 'FORBIDDEN' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const policyYear = searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : new Date().getFullYear();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    let query = admin
      .from('employee_leave_balances')
      .select('*, policy:policy_id(*), user_profiles!employee_id(full_name, email, department, role)', { count: 'exact' })
      .eq('policy_year', policyYear)
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data: balances, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[API] GET Admin Leave Balances Error:', error);
      throw error;
    }

    const response = NextResponse.json({
      success: true,
      data: balances || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        has_more: offset + (balances?.length || 0) < (count || 0)
      }
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Admin Leave Balances GET Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch workforce leave balances',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
