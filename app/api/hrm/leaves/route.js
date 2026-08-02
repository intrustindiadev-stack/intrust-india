import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, profile, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (profile?.role !== 'hr_manager') {
      return NextResponse.json({ error: 'Forbidden: HR Manager privilege required', code: 'FORBIDDEN' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending_hr_review';
    const search = searchParams.get('search') || '';
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    let query = admin
      .from('leave_requests')
      .select('*, leave_request_actions(*, user_profiles:actor_id(full_name, role)), user_profiles!employee_id(full_name, email, department, role)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Exclude HR manager's own requests from team approvals queue if filtering pending_hr_review
    if (status === 'pending_hr_review') {
      query = query
        .eq('status', 'pending_hr_review')
        .neq('employee_id', user.id)
        .neq('requester_role_snapshot', 'hr_manager');
    } else if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[API] GET HR Leaves Queue Error:', error);
      throw error;
    }

    let filtered = requests || [];
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.user_profiles?.full_name?.toLowerCase().includes(term) ||
        r.user_profiles?.email?.toLowerCase().includes(term)
      );
    }

    const response = NextResponse.json({
      success: true,
      data: filtered,
      pagination: {
        total: count || 0,
        page,
        limit,
        has_more: offset + (requests?.length || 0) < (count || 0)
      }
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] HR Leaves Queue Server Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch HR leave queue',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
