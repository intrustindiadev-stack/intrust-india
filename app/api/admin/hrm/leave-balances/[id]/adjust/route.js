import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/apiAuth';
import { AdjustBalanceSchema } from '@/lib/hrm/validation';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const { user, profile, admin } = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required', code: 'FORBIDDEN' }, { status: 403 });
    }

    const resolvedParams = await params;
    const balanceId = resolvedParams?.id;
    if (!balanceId) {
      return NextResponse.json({ error: 'Balance ID is required', code: 'INVALID_INPUT' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = AdjustBalanceSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        code: 'INVALID_INPUT',
        details: parseResult.error.errors
      }, { status: 400 });
    }

    const { delta_days, reason } = parseResult.data;

    // Execute atomic balance adjustment RPC
    const { data, error } = await admin.rpc('adjust_employee_leave_balance', {
      p_balance_id: balanceId,
      p_delta_days: delta_days,
      p_reason: reason,
      p_actor_id: user.id
    });

    if (error) {
      console.error('[API] Adjust Leave Balance RPC Error:', error);
      return NextResponse.json({
        error: error.message || 'Balance adjustment failed',
        code: 'ADJUSTMENT_FAILED'
      }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      data
    }, { status: 200 });

    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (err) {
    console.error('[API] Adjust Leave Balance Error:', err);
    return NextResponse.json({
      error: 'An unexpected server error occurred during balance adjustment',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
