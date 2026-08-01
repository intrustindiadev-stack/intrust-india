import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { LeaveRequestSchema } from '@/lib/hrm/validation';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year'), 10) : new Date().getFullYear();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    let query = admin
      .from('leave_requests')
      .select('*, user_profiles(full_name, department)', { count: 'exact' })
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (year) {
      query = query.eq('policy_year', year);
    }

    const { data: requests, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[API] GET Leaves Error:', error);
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
    console.error('[API] Employee Leaves Error:', err);
    return NextResponse.json({
      error: 'Failed to fetch leave requests',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = LeaveRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        code: 'INVALID_INPUT',
        details: parseResult.error.errors
      }, { status: 400 });
    }

    const { leave_type, from_date, to_date, reason } = parseResult.data;

    // Execute atomic submission RPC
    const { data, error } = await admin.rpc('submit_leave_request', {
      p_leave_type: leave_type,
      p_from_date: from_date,
      p_to_date: to_date,
      p_reason: reason ?? null,
      p_employee_id: user.id
    });

    if (error) {
      console.error('[API] Submit Leave RPC Error:', error);
      const isDomainError = error.message && !error.message.includes('fatal');
      return NextResponse.json({
        error: error.message || 'Failed to submit leave request',
        code: 'SUBMISSION_FAILED'
      }, { status: isDomainError ? 400 : 500 });
    }

    const response = NextResponse.json({
      success: true,
      request: data?.request
    }, { status: 201 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Leave Submission Server Error:', err);
    return NextResponse.json({
      error: 'An unexpected error occurred during leave submission',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
