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
    const status = searchParams.get('status') || 'pending_admin_confirmation';
    const year = searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : null;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    let query = admin
      .from('leave_requests')
      .select('*, leave_request_actions(*, user_profiles:actor_id(full_name, role)), user_profiles!employee_id(full_name, email, department, role)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (year) {
      query = query.eq('policy_year', year);
    }

    const { data: requests, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[API] GET Admin Leaves Queue Error:', error);
      throw error;
    }

    const response = NextResponse.json({
      success: true,
      data: requests || [],
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
    console.error('[API] Admin Leaves Queue Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch admin leave queue',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
